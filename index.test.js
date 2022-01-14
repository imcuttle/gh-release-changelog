const ghReleaseChangelog = require("./gh-release-changelog");
const process = require("process");
const cp = require("child_process");
const path = require("path");

const fixture = (name) => path.resolve(__dirname, "fixture", name);

test("ghReleaseChangelog valid", async () => {
  const data = await ghReleaseChangelog({
    cwd: fixture("valid"),
    tag: "v1.0.0",
    dryRun: true,
    githubToken: "noop",
    label: "@rcp/abc",
    skipEnvGithubRepoInfer: true,
  });
  expect(data.changelogFilename).toBe(fixture("valid/CHANGELOG.md"));
  delete data.changelogFilename;
  expect(data).toMatchSnapshot();
});

test("ghReleaseChangelog lerna-sub not-found", async () => {
  const data = await ghReleaseChangelog({
    cwd: fixture("lerna-sub"),
    tag: "v1.0.0",
    dryRun: true,
    githubToken: "noop",
    label: "@rcp/abc",
    skipEnvGithubRepoInfer: true,
  });
  expect(data.changelogFilename).toBe(fixture("lerna-sub/CHANGELOG.md"));
  delete data.changelogFilename;
  expect(data).toMatchSnapshot();
});

test("ghReleaseChangelog lerna-sub version bump only", async () => {
  const data = await ghReleaseChangelog({
    cwd: fixture("lerna-sub"),
    tag: "v1.0.1",
    dryRun: true,
    githubToken: "noop",
    label: "@rcp/abc",
    skipEnvGithubRepoInfer: true,
  });
  expect(data.changelogFilename).toBe(fixture("lerna-sub/CHANGELOG.md"));
  delete data.changelogFilename;
  expect(data).toMatchSnapshot();
});
