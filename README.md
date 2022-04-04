# stale-repo-finder
This repo contains the following actions workflow.
1. A workflow that will identify “stale” repos in an org or list of orgs. This workflow will take as input
    1. A list of orgs.
    2. A number of days for considering if a repo is stale.
    3. A minimum repo size in megabytes. Only repos larger than this size will be considered.

    This workflow will put the repos if considers “stale” into archive mode, locking the repo from further changes. The workflow will also create a csv file for each org with the following fields:
    1. Repo name
    2. Number of days since last activity
    3. Repo size
    5. List of contributors

    The csv file(s) will be checked into source control in the same repo as the workflow.

You will need to add a secret called `TOKEN` to this repo. The value needs to be a PAT that has access to the orgs you are looking in.
## Debugging locally
Unit tests are contained in [.github/scripts/test.js](.github/scripts/test.js). In VSCode, you can run the  `Mocha` launch config from the debug interface to hit breakpoints and step through code.