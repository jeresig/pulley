#!/usr/bin/env node
/*
 * Pulley: Easy Github Pull Request Lander
 * Copyright 2011 John Resig
 * MIT Licensed
 */
(function() {
	"use strict";

	var child = require("child_process"),
		http = require("https"),
		fs = require("fs"),
		prompt = require("prompt"),
		request = require("request"),

		// Process references
		exec = child.exec,
		spawn = child.spawn,

		// Process arguments
		id = process.argv[ 2 ],
		done = process.argv[ 3 ],

		// Localized application references
		user_repo = "",
		tracker = "",
		token = "",

		// Initialize config file
		config = JSON.parse( fs.readFileSync( __dirname + "/config.json" ) );

	// We don't want the default prompt message
	prompt.message = "";

	process.stdout.write("Initializing... ");

	exec( "git config --global --get pulley.token", function( error, stdout, stderr ) {
		token = trim( stdout );

		if ( token ) {
			init();
		} else {
			login();
		}
	});

	function login() {
		console.log("Please login with your GitHub credentials.");
		console.log("Your credentials are only needed this one time to get a token from GitHub.");
		prompt.start();
		prompt.get([{
			name: "username",
			message: "Username",
			empty: false
		}, {
			name: "password",
			message: "Password",
			empty: false,
			hidden: true
		}], function( err, result ) {
			var auth = result.username + ":" + result.password;
			request.post("https://" + auth + "@api.github.com/authorizations", {
				json: true,
				body: {
					scopes: ["repo"],
					note: "Pulley",
					note_url: "https://github.com/jeresig/pulley"
				}
			}, function( err, res, body ) {
				token = body.token;
				if ( token ) {
					exec( "git config --global --add pulley.token " + token, function( error, stdout, stderr ) {
						console.log( "Success!".green );
						init();
					});
				} else {
					console.log( ( body.message + ". Try again." ).red );
					login();
				}
			});
		});
	}

	function init() {
		if ( !id ) {
			exit("No pull request ID specified, please provide one.");
		}
		exec( "git remote -v show " + config.remote, function( error, stdout, stderr ) {
			user_repo = ( /URL:.*?([\w\-]+\/[\w\-]+)/.exec( stdout ) || [] )[ 1 ];
			tracker = config.repos[ user_repo ];

			if ( user_repo ) {
				getStatus();
			} else {
				exit("External repository not found.");
			}
		});
	}

	function getStatus() {
		exec( "git status", function( error, stdout, stderr ) {
			if ( /Changes to be committed/i.test( stdout ) ) {
				if ( done ) {
					getPullData();
				} else {
					exit("Please commit changed files before attemping a pull/merge.");
				}
			} else if ( /Changes not staged for commit/i.test( stdout ) ) {
				if ( done ) {
					exit("Please add files that you wish to commit.");

				} else {
					exit("Please stash files before attempting a pull/merge.");
				}
			} else {
				if ( done ) {
					exit("It looks like you've broken your merge attempt.");
				} else {
					getPullData();
				}
			}
		});
	}

	function getPullData() {
		process.stdout.write("done.\n");
		process.stdout.write("Getting pull request details... ");

		callApi({
			path: "/repos/" + user_repo + "/pulls/" + id
		}, function( data ) {
			try {
				var pull = JSON.parse( data );

				process.stdout.write("done.\n");

				if ( done ) {
					commit( pull );
				} else {
					mergePull( pull );
				}
			} catch( e ) {
				exit("Error retrieving pull request from Github.");
			}
		});
	}

	function mergePull( pull ) {
		var repo = pull.head.repo.ssh_url,
			repo_branch = pull.head.ref,
			branch = "pull-" + id,
			checkout = "git checkout -b " + branch;

		process.stdout.write("Pulling and merging results... ");

		if ( pull.state === "closed" ) {
			exit("Can not merge closed Pull Requests.");
		}

		if ( pull.merged ) {
			exit("This Pull Request has already been merged.");
		}

		// TODO: give user the option to resolve the merge by themselves
		if ( !pull.mergeable ) {
			exit("This Pull Request is not automatically mergeable.");
		}

		exec( "git checkout master && git pull " + config.remote + " master && git submodule update --init && " + checkout, function( error, stdout, stderr ) {
			if ( /toplevel/i.test( stderr ) ) {
				exit("Please call pulley from the toplevel directory of this repo.");
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
					exit("Merge conflict. Please resolve then run: " +
						process.argv.join(" ") + " done");
				} else {
					process.stdout.write("done.\n");
					commit( pull );
				}
			});
		}
	}

	function commit( pull ) {
		process.stdout.write("Getting author and committing changes... ");

		callApi({
			path: "/repos/" + user_repo + "/pulls/" + id + "/commits"
		}, function( data ) {
			var match,
				msg = "Closes #" + id + ": " + pull.title + ".",
				author = JSON.parse( data )[ 0 ].commit.author.name,
				issues = [],
				urls = [],
				findBug = /#(\d+)/g;

			// Search title and body for issues for issues to link to
			if ( tracker ) {
				while ( ( match = findBug.exec( pull.title + pull.body ) ) ) {
					urls.push( tracker + match[ 1 ] );
				}
			}

			// Search just body for issues to add to the commit message
			while ( ( match = findBug.exec( pull.body ) ) ) {
				issues.push( " Fixes #" + match[ 1 ] );
			}

			// Add issues to the commit message
			msg += issues.join(",");

			if ( urls.length ) {
				msg += "\n\nMore Details:" + urls.map(function( url ) {
					return "\n - " + url;
				}).join("");
			}

			var commit = [ "commit", "-a", "--message=" + msg ];

			if ( config.interactive ) {
				commit.push("-e");
			}

			if ( author ) {
				commit.push( "--author=" + author );
			}

			getHEAD(function( oldCommit ) {
				// Thanks to: https://gist.github.com/927052
				spawn( "git", commit, {
					customFds: [ process.stdin, process.stdout, process.stderr ]
				}).on( "exit", function() {
					getHEAD(function( newCommit ) {
						if ( oldCommit === newCommit ) {
							reset("No commit, aborting push.");
						} else {
							exec( "git push " + config.remote + " master", function( error, stdout, stderr ) {
								process.stdout.write("done.\n");
								exit();
							});
						}
					});
				});
			});
		});
	}

	// TODO: Add check to API call if autorization fails. Show login to reauthorize.
	function callApi( options, callback, data ) {
		setTimeout(function() {
			var req, datastring;

			options.host = options.host || "api.github.com";
			options.port = 443;
			options.headers = {
				Authorization: "token " + token,
				Host: "api.github.com"
			};

			if ( data ) {
				datastring = JSON.stringify( data );
				options.headers["Content-Type"] = "application/x-www-form-urlencoded";
				options.headers["Content-Length"] = datastring.length;
			}

			req = http.request( options, function( res ) {
				var data = [];

				res.on( "data", function( chunk ) {
					data.push( chunk );
				});

				res.on( "end", function() {
					setTimeout(function() {
						callback( data.join("") );
					}, 1000);
				});
			});

			if ( data ) {
				req.write( datastring );
			}

			req.end();
		}, 1000);
	}

	function getHEAD( fn ) {
		exec( "git log | head -1", function( error, stdout, stderr ) {
			var commit = ( /commit (.*)/.exec( stdout ) || [] )[ 1 ];

			fn( commit );
		});
	}

	function reset( msg ) {
		console.error( "\n" + msg );
		process.stderr.write("Resetting files... ");

		exec( "git reset --hard ORIG_HEAD", function() {
			process.stderr.write("done.\n");
			exit();
		});
	}

	function exit( msg ) {
		if ( msg ) {
			console.error( "\nError: " + msg );
		}

		process.exit( 1 );
	}

	function trim( string ) {
		return string.replace( /^\s*|\s*$/g, '' );
	}

})();