#!/usr/bin/env node
/*
 * Pulley: Easy Github Pull Request Lander
 * Copyright 2011 John Resig
 * MIT Licensed
 */

// Use the follow to specify custom bug tracker URLs
var repos = {
		"jquery/jquery": "http://bugs.jquery.com/ticket/"
	},

	// You can specify these inline or in the Git config
	// http://help.github.com/git-email-settings/
	github_user = "",
	github_token = "";

var child = require("child_process"),
	exec = child.exec,
	spawn = child.spawn,
	http = require("https"),
	id = process.argv[2],
	done = process.argv[3],
	user_repo = "",
	tracker = "";

process.stdout.write( "Initializing... " );

// If the user or token is blank, check git config and fill them in from there
if ( !github_user || !github_token ) {
	exec( "git config --get-regexp github", function( error, stdout, stderr ) {
		github_user = github_user || (/github.user (.*)/.exec( stdout ) || [])[1];
		github_token = github_token || (/github.token (.*)/.exec( stdout ) || [])[1];

		// If user and token are good, run init. Otherwise exit with a message
		if ( github_user && github_token ) {
			exec( "git remote -v show origin", function( error, stdout, stderr ) {
				user_repo = (/URL:.*?(\w+\/\w+)/.exec( stdout ) || [])[1];
				tracker = repos[ user_repo ];

				if ( user_repo ) {
					tracker = tracker || "https://github.com/" + user_repo + "/issues/";

					init();

				} else {
					exit( "External repository not found." );
				}
			});

		} else {
			exit( "Please specify a Github username and token:\n  http://help.github.com/git-email-settings/" );
		}
	});

} else {
	init();
}

function init() {
	if ( !id ) {
		exit( "No pull request ID specified, please provide one." );
	}

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

	http.request({
		host: "github.com",
		port: 443,
		path: "/api/v2/json/pulls/" + user_repo + "/" + id
	}, function (res) {
		var data = [];

		res.on( "data", function( chunk ) {
			data.push( chunk );
		});

		res.on( "end", function() {
			try {
				var pull = JSON.parse( data.join("") ).pull;

				process.stdout.write( "done.\n" );

				if ( done ) {
					commit( pull );

				} else {
					mergePull( pull );
				}

			} catch( e ) {
				exit( "Error retreiving pull request from Github." );
			}
		});
	}).end();
}

function mergePull( pull ) {
	process.stdout.write( "Pulling and merging results... " );

	var repo = pull.head.repository.url + ".git",
		repo_branch = pull.head.ref,
		branch = "pull-" + id,
		checkout = "git checkout -b " + branch;

	exec( "git checkout master && git pull && " + checkout, function( error, stdout, stderr ) {
		if ( /fatal/i.test( stderr ) ) {
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

	http.request({
		host: "github.com",
		port: 443,
		path: "/" + user_repo + "/pull/" + id + ".patch"
	}, function( res ) {
		var data = [];

		res.on( "data", function( chunk ) {
			data.push( chunk );
		});

		res.on( "end", function() {
			var author = (/From: (.*)/.exec( data.join("") ) || [])[1],
				tmp = {}, urls = [], msg = "",
				search = pull.title + " " + pull.body,
				findBug = /#(\d{4,5})/g,
				match;

			while ( (match = findBug.exec( search )) ) {
				tmp[ match[1] ] = 1;
			}
			
			msg = "Landing pull request " + id + ". " + pull.title + " Fixes ";

			urls.push( "https://github.com/" + user_repo + "/pull/" + id );

			msg += (Object.keys( tmp ).sort().map(function( num ) {
				if ( tracker ) {
					urls.push( tracker + num );
				}

				return "#" + num;
			}).join(", ") || "#????") + ".";

			msg += "\n\nMore Details:" + urls.map(function( url ) {
				return "\n - " + url;
			}).join("");

			var commit = [ "commit", "-a", "-e", "--message=" + msg ];

			if ( author ) {
				commit.push( "--author=" + author );
			}

			getHEAD(function( oldCommit ) {
				// Thanks to: https://gist.github.com/927052
				spawn( "git", commit, { customFds:
						[ process.stdin, process.stdout, process.stderr ] } )
					.on("exit", function() {
						getHEAD(function( newCommit ) {
							if ( oldCommit === newCommit ) {
								reset( "No commit, aborting push." );

							} else {
								exec( "git push", function( error, stdout, stderr ) {
									process.stdout.write( "done.\n" );
									closePull( newCommit );
								});
							}
						});
					});
			});
		});
	}).end();
}

function closePull( commit ) {
	process.stdout.write( "Commenting on and closing pull request... " );

	var auth = "login=" + github_user + "&token=" + github_token;

	http.request({
		host: "github.com",
		port: 443,
		path: "/api/v2/json/issues/comment/" + user_repo + "/" + id,
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" }
	}, function (res) {
		http.request({
			host: "github.com",
			port: 443,
			path: "/api/v2/json/issues/close/" + user_repo + "/" + id,
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" }
		}, function() {
			process.stdout.write( "done.\n" );
		}).end( auth );
	}).end( auth + "&comment=Landed in commit " + commit + "." );
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
