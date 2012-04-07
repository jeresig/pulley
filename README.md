Pulley: An Easy Github Pull Request Lander
==========================================

Landing a pull request from Github can be annoying. You can follow the instructions provided by Github (pulling the code, doing a merge) but that'll result in a messy commit stream and external ticket trackers that don't automatically close tickets.

Additionally you can pull the code and squash it down into a single commit, which lets you format the commit nicely (closing tickets on external trackers) - but it fails to properly close the pull request.

Pulley is a tool that uses the best aspects of both techniques. Pull requests are pulled and merged into your project. The code is then squashed down into a single commit and nicely formatted with appropriate bug numbers and links. Finally the commit is pushed and the pull request is closed with a link to the commit.

Pulley is written using Node.js - thus you'll need to make sure that you have Node installed prior to running it.

How to use:

Start by configuring the details in the config.json file. Once that's complete you can run the following command:

    node pulley.js PID # Where PID is the Pull Request ID

For example running the command `node pulley.js 332` on the jQuery repo yielded the following closed pull request and commit:

- https://github.com/jquery/jquery/pull/332
- https://github.com/jquery/jquery/commit/d274b7b9f7727e8bccd6906d954e4dc790404d23
