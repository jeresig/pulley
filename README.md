# Pulley

### An Easy Github Pull Request Lander


## Introduction

Landing a pull request from Github can be messy. You can push the merge button, but that'll result in a messy commit stream and external ticket trackers that don't automatically close tickets.

Additionally you can pull the code and squash it down into a single commit, which lets you format the commit nicely (closing tickets on external trackers) - but it fails to properly close the pull request.

Pulley is a tool that uses the best aspects of both techniques. Pull requests are pulled and merged into your project. The code is then squashed down into a single commit and nicely formatted with appropriate bug numbers and links. Finally the commit is pushed and the pull request is closed with a reference to the commit.


## Getting Started


### Install

Make sure you have [Node.js](http://nodejs.org/#download) and then run `npm install -g pulley` in Terminal.


### Use

Open the target repo in Terminal and run `pulley PID`, where PID is the Pull Request ID.


### Example

Running `pulley 332` on the jQuery repo yielded the following closed [pull request](https://github.com/jquery/jquery/pull/332) and [commit](https://github.com/jquery/jquery/commit/d274b7b9f7727e8bccd6906d954e4dc790404d23).


## Contribute and Test

In order to test your changes to pulley, you need the ability to:

- Open and close pull requests
- Push to a branch on a repo

Essentially, you need your own repo, and the ability to issue pull requests against that repo. Fortunately, GitHub allows you to issue pull requests against your own repo from one branch to another. Here are the steps:

1. Fork pulley
2. Checkout the `test` branch
3. Branch off from the `test` branch to another branch named `test-1`
4. Create a commit on the `test-1` branch
5. Publish the `test-1` branch
6. Push the commit to the `test-1` branch on your fork of pulley
7. Open a pull request from `test-1` to `test` *on your own repo*
8. Use pulley to merge your pull request, and ensure everything went smoothly
9. Submit your real pull request with your changes

Please lend a hand!