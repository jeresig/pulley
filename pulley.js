#!/usr/bin/env node
/*
 * Pulley: Easy Github Pull Request Lander
 * Copyright 2011 John Resig
 * MIT Licensed
 */
(function() {
"use strict";

var // Application requirements
	child = require( "child_process" ),
	http = require( "https" ),
	fs = require( "fs" ),

	// Process references
	exec = child.exec,
	spawn = child.spawn,

	// Process arguments
	id = process.argv[2],
	done = process.argv[3],

	// Localized application references
	user_repo = "",
	tracker = "",

	// Initialize config file
	config = JSON.parse(fs.readFileSync( __dirname + "/config.json" ));

process.stdout.write( "Initializing... " );

// If the user or password is blank, check git config and fill them in from there
if ( !config.gitconfig.user || !config.gitconfig.password) {
	exec( "git config --get-regexp github", function( error, stdout, stderr ) {
		config.gitconfig.user = config.gitconfig.user || (/github.user (.*)/.exec( stdout ) || [])[1];
		config.gitconfig.password = config.gitconfig.password || (/github.password (.*)/.exec( stdout ) || [])[1];

		init();
	});

} else {
	init();
}

function init() {
	if ( !id ) {
		exit( "No pull request ID specified, please provide one." );
	}

	// If user and password are good, run init. Otherwise exit with a message
	if ( config.gitconfig.user && config.gitconfig.password ) {

		exec( "git remote -v show " + config.remote, function( error, stdout, stderr ) {
			user_repo = (/URL:.*?([\w\-]+\/[\w\-]+)/.exec( stdout ) || [])[1];
			tracker = config.repos[ user_repo ];

			if ( user_repo ) {
				tracker = tracker || "https://github.com/" + user_repo + "/issues/";

				getStatus();

			} else {
				exit( "External repository not found." );
			}
		});

	} else {
		exit( "Please specify a Github username and password:\ngit config --global github.user USERNAME\ngit config --global github.password PASSWORD" );
	}
}

function getStatus() {

	exec( "git status", function( error, stdout, stderr ) {
		if ( /Changes to be committed/i.test( stdout ) ) {
			if ( done ) {
				getPullData();

			} else {
				exit( "Please commit changed files before attemping a pull/merge." );
			}

		} else if ( /Changes not staged for commit/i.test( stdout ) ) {
			if ( done ) {
				exit( "Please add files that you wish to commit." );

			} else {
				exit( "Please stash files before attempting a pull/merge." );
			}
		} else {
			if ( done ) {
				exit( "It looks like you've broken your merge attempt." );

			} else {
				getPullData();
			}
		}
	});
}


function getPullData() {
	process.stdout.write( "done.\n" );
	process.stdout.write( "Getting pull request details... " );

	callApi({
		path: "/repos/" + user_repo + "/pulls/" + id
	}, function( data ) {
		try {
			var pull = JSON.parse(data);

			process.stdout.write( "done.\n" );

			if ( done ) {
				commit( pull );
			} else {
				mergePull( pull );
			}

		} catch( e ) {
			exit( "Error retrieving pull request from Github." );
		}
	});
}

function mergePull( pull ) {
	process.stdout.write( "Pulling and merging results... " );

	var repo = pull.head.repo.ssh_url,
		repo_branch = pull.head.ref,
		branch = "pull-" + id,
		checkout = "git checkout -b " + branch;

	exec( "git checkout master && git pull " + config.remote + " master && git submodule update --init && " + checkout, function( error, stdout, stderr ) {
		if ( /toplevel/i.test( stderr ) ) {
			exit( "please call pulley from the toplevel directory of this repository" );
		} else if ( /fatal/i.test( stderr ) ) {
			exec( "git branch -D " + branch + " && " + checkout, doPull );

		} else {
			doPull();
		}
	});

	function doPull( error, stdout, stderr ) {
		var pull_cmds = [
			"git pull " + repo + " " + repo_branch,
			"git checkout master",
			"git merge --no-commit --squash " + branch
		];

		exec( pull_cmds.join( " && " ), function( error, stdout, stderr ) {
			if ( /Merge conflict/i.test( stdout ) ) {
				exit( "Merge conflict. Please resolve then run: " +
					process.argv.join( " " ) + " done" );

			} else {
				process.stdout.write( "done.\n" );
				commit( pull );
			}
		});
	}
}

function commit( pull ) {
	process.stdout.write( "Getting author and committing changes... " );

	callApi({
		path: "/repos/" + user_repo + "/pulls/" + id + "/commits"
	}, function( data ) {
		var match,
			msg = "Pull Request Closes #" + id + ": " + pull.title + ".",
			author = JSON.parse(data)[0].commit.author.name,
			issues = [],
			urls = [],
			findBug = /#(\d+)/g;

		// search title and body for issues
		// for issues to link to
		if ( tracker ) {
			while ( (match = findBug.exec( pull.title + pull.body )) ) {
				urls.push( tracker + match[1] );
			}
		}

		// search just body for issues to add to the commit message
		while ( (match = findBug.exec( pull.body )) ) {
			issues.push( " Fixes #" + match[1] );
		}

		// add issues to the commit message
		msg += issues.join(",");

		if ( urls.length ) {
			msg += "\n\nMore Details:" + urls.map(function( url ) {
				return "\n - " + url;
			}).join("");
		}

		var commit = [ "commit", "-a", "--message=" + msg ];

		if ( config.interactive ) {
			commit.push( "-e" );
		}

		if ( author ) {
			commit.push( "--author=" + author );
		}

		getHEAD(function( oldCommit ) {
			// Thanks to: https://gist.github.com/927052
			spawn( "git", commit, {
				customFds: [ process.stdin, process.stdout, process.stderr ]
			}).on("exit", function() {
				getHEAD(function( newCommit ) {

					if ( oldCommit === newCommit ) {
						reset( "No commit, aborting push." );
					} else {
						exec( "git push " + config.remote + " master", function( error, stdout, stderr ) {
							process.stdout.write( "done.\n" );
							exit();
						});
					}
				});
			});
		});
	});
}

function callApi(options, callback, data) {
	setTimeout(function(){
		var req, datastring;

		options.host = options.host || "api.github.com";
		options.port = 443;
		options.headers = {
			"Authorization": "Basic " + new Buffer(config.gitconfig.user + ":" + config.gitconfig.password).toString('base64'),
			Host: "api.github.com"
		};

		if(data){
			datastring = JSON.stringify(data);
			options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
			options.headers['Content-Length'] = datastring.length;
		}

		req = http.request(options, function( res ) {
			var data = [];

			res.on( "data", function( chunk ) {
				data.push( chunk );
			});

			res.on( "end", function() {
				setTimeout(function(){
					callback(data.join(""));
				}, 1000);
			});
		});

		if(data){
			req.write(datastring);
		}

		req.end();
	}, 1000);
}

function getHEAD( fn ) {
	exec( "git log | head -1", function( error, stdout, stderr ) {
		var commit = (/commit (.*)/.exec( stdout ) || [])[1];

		fn( commit );
	});
}

function reset( msg ) {
	console.error( "\n" + msg );
	process.stderr.write( "Resetting files... " );

	exec( "git reset --hard ORIG_HEAD", function() {
		process.stderr.write( "done.\n" );
		exit();
	});
}

function exit( msg ) {
	if ( msg ) {
		console.error( "\nError: " + msg );
	}

	process.exit( 1 );
}

})();