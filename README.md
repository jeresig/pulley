Pulley: An Easy Github Pull Request Lander
==========================================

Landing a pull request from Github can be messy. You can push the merge button but that'll result in a messy commit stream and external ticket trackers that don't automatically close tickets.

Additionally you can pull the code and squash it down into a single commit, which lets you format the commit nicely (closing tickets on external trackers) - but it fails to properly close the pull request.

Pulley is a tool that uses the best aspects of both techniques. Pull requests are pulled and merged into your project. The code is then squashed down into a single commit and nicely formatted with appropriate bug numbers and links. Finally the commit is pushed and the pull request is closed with a link to the commit.

Pulley is written using Node.js - thus you'll need to make sure that you have Node installed prior to running it.

How To Use
-------------

Start by configuring the details in the config.json file. Once that's complete you can run the following command:

    node pulley.js PID # Where PID is the Pull Request ID

For example running the command `node pulley.js 332` on the jQuery repo yielded the following closed pull request and commit:

- https://github.com/jquery/jquery/pull/332
- https://github.com/jquery/jquery/commit/d274b7b9f7727e8bccd6906d954e4dc790404d23

How To Contribute and Test
--------------------------

In order to test your improvements to pulley, you need a few things:

1. The ability to open and close pull requests.
2. The ability to push to a branch on a repo.

Essentially, you need your own repo, and the ability to issue pull requests against that repo. Fortunately, github allows you to issue pull requests against your own repo from one branch to another. Here are the steps:

1. Fork pulley.
2. checkout the `test` branch.
3. branch off from the `test` branch to another branch named `test-1`.
4. create a commit on the `test-1` branch.
5. push the commit to the `test-1` branch on your fork of pulley.
6. Open a pull request from `test-1` to `test` *on your own repo*.
7. Use pulley to merge your pull request, and ensure everything went smoothly.
8. Submit your real pull request with your changes.

Please lend a hand!