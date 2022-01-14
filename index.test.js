const ghReleaseChangelog = require("./gh-release-changelog");
const process = require("process");
const cp = require("child_process");
const path = require("path");

const fixture = (name) => path.resolve("fixture", name);

test("ghReleaseChangelog valid", async () => {
  const data = await ghReleaseChangelog({
    cwd: fixture("valid"),
    tag: "v1.0.0",
    dryRun: true,
    githubToken: "noop",
    label: "@rcp/abc",
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
  });
  expect(data.changelogFilename).toBe(fixture("lerna-sub/CHANGELOG.md"));
  delete data.changelogFilename;
  expect(data).toMatchSnapshot();
});

// shows how the runner will run a javascript action with env / stdout protocol
test("test runs", () => {
  process.env["INPUT_MILLISECONDS"] = 100;
  const ip = path.join(__dirname, "index.js");
  const result = cp.execSync(`node ${ip}`, { env: process.env }).toString();
  console.log(result);
});
