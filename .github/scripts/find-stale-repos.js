const { Octokit } = require("@octokit/rest");
const fs = require("fs");

let octokit;

module.exports = async ({github, context, options}) => {
  let orgs = options.orgs.split(",").map(function(item) {
    return item.trim();
  });
  octokit = new Octokit({
      auth: options.token
  });
  for (org of orgs) {
    let staleRepoList = [];
    console.log(`Checking repos for ${org}`);
    // TODO: Pagination for repos
    const repos = await octokit.paginate(
      `GET /orgs/${org}/repos`,
      {
        per_page: 100,
      },
      response => response.data.filter(r => !r.archived && r.size >= options.minSize*1000)
    )
    let orgCsv = '';
    
    console.log(`Found ${repos.length} repos`);
    for (repo of repos) {
      if (await isRepoStale(repo, options)) {
        console.log(`Adding ${repo.name} to list of stale repos`);
        staleRepoList.push(repo);
      } else {
        console.log(`${repo.name} is not stale`);
      }
    }
    // output to csv file with the org name and the following fields:
    // repo name, num or days since last push, repo size, list of contributors
    
    for (repo of staleRepoList) {
      let contributors = await octokit.request(`GET /repos/${repo.owner.login}/${repo.name}/contributors`, {
        owner: repo.owner.login,
        repo: repo.name
      });
      let contributorsList = [];
      if (typeof(contributors.data) != "undefined") {
        contributorsList = contributors.data.map(function(item) {
          return item.login;
        });
      }
      let contributorsString = contributorsList.join(" ");
      let repoSize = repo.size;
      let daysSinceLastPush = new Date() - new Date(repo.pushed_at);
      daysSinceLastPush = Math.floor(daysSinceLastPush / (1000 * 60 * 60 * 24));
      let csvLine = `${repo.name},${daysSinceLastPush},${repoSize},${contributorsString}`;
      console.log(csvLine);
      orgCsv += csvLine + '\n';
    }
    if (orgCsv.length > 0) {
      await octokit.repos.createOrUpdateFileContents({
        owner: context.payload.organization.login,
        repo: context.payload.repository.name,
        path: `stale-repo-list/${repo.owner.login}.csv`,
        message: "Update README.md",
        content: Buffer.from(orgCsv).toString("base64"),
        commiter : {
          name: "GitHub Actions",
          email: "github@github.com"
        },
        author: {
          name: "GitHub Actions",
          email: "github@github.com"
        }
      });
    }
    console.log("Done with org " + org);
  }
}

async function isRepoStale(repo, options) {
  //console.log(`Checking if ${repo.name} is stale`);
  if (repo.archived) {
    console.log(`${repo.name} is archived`);
    return true;
  } else {

    let lastUpdated = new Date(repo.pushed_at);
    let now = new Date();
    let diff = now - lastUpdated;
    let days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > options.staleDays) {
      if (!await isIssuesStale(repo, options)) {
        // repo has no recent pushes, but has recent issue activity, so not considered stale
        return false;
      }
      // repo is stale and has no recent issue activity, so consider stale
      //console.log(`${repo.name} is stale`);
      return true;
    } else {
      // repo has recent pushes, so not considered stale
      //console.log(`${repo.name} is not stale`);
      return false;
    }
  }
}

async function isIssuesStale(repo, options) {
  console.log(`${repo.name}: No recent pushes, checking if issues are stale`);
  let issues = await octokit.rest.issues.listForRepo({
    owner: repo.owner.login,
    repo: repo.name,
    sort: 'updated'
  });
  // TODO: do we get a 404 if there are no issues? No
  if (issues.data.length > 0) {
    let lastUpdated = new Date(issues.data[0].updated_at);
    let now = new Date();
    let diff = now - lastUpdated;
    let days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > options.staleDays) {
      // no recent issue activity, so consider stale
      return true;
    } else {
      // repo has recent issue activity, so not considered stale
      return false;
    }
  } else {
    // repo has no issues, so consider stale
    return true;
  }
}