const { test } = require('uvu');
const assert = require('uvu/assert');
const fs = require("fs");
//const mockFs = require("mock-fs");

const nock = require("nock");
nock.disableNetConnect();

const { Octokit } = require("@octokit/rest");
const github = new Octokit({
    auth: "secret123",
    userAgent: 'myApp v1.2.3'
});

const context = {
    payload: {
        repository: {
            name: "stale-repo-archiver",
        },
        organization: {
            login: "robandpdx-volcano",
            repos_url: "https://api.github.com/orgs/robandpdx-volcano/repos"
        }
    }
}

const reposVolcano = JSON.parse(fs.readFileSync("./mocks/repos-volcano.json", "utf-8"));
const reposVandelay = JSON.parse(fs.readFileSync("./mocks/repos-vandelay.json", "utf-8"));
const issuesVolcanoSuperbigmono = JSON.parse(fs.readFileSync("./mocks/issues-volcano-superbigmono.json", "utf-8"));
const issuesVolcanoTagtest = JSON.parse(fs.readFileSync("./mocks/issues-volcano-tagtest.json", "utf-8"));
const contributorsVolcanoSuperbigmono = JSON.parse(fs.readFileSync("./mocks/contributors-volcano-superbigmono.json", "utf-8"));

let options;

test.before.each(() => {
    options = {
        orgs: 'robandpdx-volcano, robandpdx-vandelay',
        staleDays: 30,
        minSize: 0,
        token: 'my-token'
    }
});
test.after.each(() => {
    // nothing to do here
});

// This test finds some repos that are not stale
test("find no stale repos", async function () {
    // set the pushed_at date to be < 30 days ago
    reposVolcano[0].pushed_at = new Date(new Date().getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    reposVolcano[1].pushed_at = new Date(new Date().getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    reposVandelay[0].pushed_at = new Date(new Date().getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    reposVandelay[1].pushed_at = new Date(new Date().getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    const mock = nock("https://api.github.com")
        .get("/orgs/robandpdx-volcano/repos?per_page=100")
            .reply(200, reposVolcano);

    mock.get("/orgs/robandpdx-vandelay/repos?per_page=100")
        .reply(200, reposVandelay);

    await require('./find-stale-repos.js')({github, context, options})
    assert.equal(mock.pendingMocks(), []);
});

// This test finds some repos that are stale push, and no recent issue activity
test("find stale repos", async function () {
    // set the pushed_at date to be > 30 days ago
    reposVolcano[0].pushed_at = new Date(new Date().getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString();
    reposVolcano[1].pushed_at = new Date(new Date().getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString();
    reposVandelay[0].pushed_at = new Date(new Date().getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString();
    reposVandelay[1].pushed_at = new Date(new Date().getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString();
    issuesVolcanoSuperbigmono[0].updated_at = new Date(new Date().getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString();
    issuesVolcanoTagtest[0].updated_at = new Date(new Date().getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString();
    const mock = nock("https://api.github.com")
        .get("/orgs/robandpdx-volcano/repos?per_page=100")
            .reply(200, reposVolcano);

    mock.get("/repos/robandpdx-volcano/superbigmono/issues?sort=updated")
        .reply(200, issuesVolcanoSuperbigmono);

    mock.get("/repos/robandpdx-volcano/tagtest/issues?sort=updated")
        .reply(200, issuesVolcanoTagtest);

    mock.get("/repos/robandpdx-volcano/superbigmono/contributors?owner=robandpdx-volcano&repo=superbigmono")
        .reply(200, contributorsVolcanoSuperbigmono);

    mock.get("/repos/robandpdx-volcano/tagtest/contributors?owner=robandpdx-volcano&repo=tagtest")
        .reply(200, contributorsVolcanoSuperbigmono);

    mock.get("/orgs/robandpdx-vandelay/repos?per_page=100")
        .reply(200, reposVandelay);

    mock.get("/repos/robandpdx-vandelay/import-business/issues?sort=updated")
        .reply(200, issuesVolcanoSuperbigmono);

    mock.get("/repos/robandpdx-vandelay/export-business/issues?sort=updated")
        .reply(200, issuesVolcanoTagtest);

    mock.get("/repos/robandpdx-vandelay/import-business/contributors?owner=robandpdx-vandelay&repo=import-business")
        .reply(200, contributorsVolcanoSuperbigmono);

    mock.get("/repos/robandpdx-vandelay/export-business/contributors?owner=robandpdx-vandelay&repo=export-business")
        .reply(200, contributorsVolcanoSuperbigmono);

    mock.put("/repos/robandpdx-volcano/stale-repo-archiver/contents/stale-repo-list%2Frobandpdx-volcano.csv",
        (requestBody) => {
            return true;
        }
    ).reply(200);

    mock.put("/repos/robandpdx-volcano/stale-repo-archiver/contents/stale-repo-list%2Frobandpdx-vandelay.csv",
        (requestBody) => {
            return true;
        }
    ).reply(200);

    await require('./find-stale-repos.js')({github, context, options})
    assert.equal(mock.pendingMocks(), []);
});

// This test finds some repos that are stale push, and no recent issue activity, and no contributors
test("find stale repos", async function () {
    options.orgs = "robandpdx-volcano";
    // set the pushed_at date to be > 30 days ago
    reposVolcano[0].pushed_at = new Date(new Date().getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString();
    reposVolcano[1].pushed_at = new Date(new Date().getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString();
    issuesVolcanoSuperbigmono[0].updated_at = new Date(new Date().getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString();
    issuesVolcanoTagtest[0].updated_at = new Date(new Date().getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString();
    const mock = nock("https://api.github.com")
        .get("/orgs/robandpdx-volcano/repos?per_page=100")
            .reply(200, reposVolcano);

    mock.get("/repos/robandpdx-volcano/superbigmono/issues?sort=updated")
        .reply(200, issuesVolcanoSuperbigmono);

    mock.get("/repos/robandpdx-volcano/tagtest/issues?sort=updated")
        .reply(200, issuesVolcanoTagtest);

    mock.get("/repos/robandpdx-volcano/superbigmono/contributors?owner=robandpdx-volcano&repo=superbigmono")
        .reply(200, contributorsVolcanoSuperbigmono);

    mock.get("/repos/robandpdx-volcano/tagtest/contributors?owner=robandpdx-volcano&repo=tagtest")
        .reply(204);

    mock.put("/repos/robandpdx-volcano/stale-repo-archiver/contents/stale-repo-list%2Frobandpdx-volcano.csv",
        (requestBody) => {
            return true;
        }
    ).reply(200);

    await require('./find-stale-repos.js')({github, context, options})
    assert.equal(mock.pendingMocks(), []);
});

// This test excludes all repos due to minSize
test("find no stale repos", async function () {
    options.minSize = 1;
    // set the pushed_at date to be < 30 days ago
    reposVolcano[0].pushed_at = new Date(new Date().getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    reposVolcano[1].pushed_at = new Date(new Date().getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    reposVandelay[0].pushed_at = new Date(new Date().getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    reposVandelay[1].pushed_at = new Date(new Date().getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    const mock = nock("https://api.github.com")
        .get("/orgs/robandpdx-volcano/repos?per_page=100")
            .reply(200, reposVolcano);

    mock.get("/orgs/robandpdx-vandelay/repos?per_page=100")
        .reply(200, reposVandelay);

    await require('./find-stale-repos.js')({github, context, options})
    assert.equal(mock.pendingMocks(), []);
});

test.run()