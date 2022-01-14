const core = require("@actions/core");
const fs = require("fs");
const nps = require("path");
const { promisify } = require("util");
const readYaml = require("read-yaml-file");
const cp = require("child_process");
const ghReleaseChangelog = require("gh-release-changelog");
const _readJSON = require("read-json-file");
const readJSON = promisify(_readJSON);

async function getWorkspaceConfig(cwd = process.cwd()) {
  const existsFile = (filename) => {
    return fs.existsSync(filename) && fs.statSync(filename).isFile();
  };
  const pnpmWorkSpace = nps.join(cwd, "pnpm-workspace.yaml");
  if (existsFile(pnpmWorkSpace)) {
    return (await readYaml(pnpmWorkSpace)).packages;
  }

  const pkgPath = nps.join(cwd, "package.json");
  if (existsFile(pkgPath)) {
    const pkg = await readJSON(pkgPath);
    if (pkg.workspaces) {
      return pkg.workspaces;
    }
  }

  const lernaPath = nps.join(cwd, "lerna.json");
  if (existsFile(lernaPath)) {
    return (await readJSON(lernaPath)).packages;
  }
}

const exec = (cmd) => {
  try {
    return cp.execSync(cmd).toString().trim();
  } catch (err) {
    core.error(err);
  }
};

// most @actions toolkit packages have async methods
async function run() {
  try {
    const ms = core.getInput("milliseconds");
    core.info(`Waiting ${ms} milliseconds ...`);

    core.debug(new Date().toTimeString()); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    const token = core.getInput("token", { required: true });
    const tag =
      core.getInput("tag") || exec(`git describe --abbrev=0 --tags HEAD`);
    const fromTag =
      core.getInput("fromTag") ||
      exec(`git describe --abbrev=0 --tags ${tag}^`);
    const ignoreTests = core.getInput("ignoreTests");
    const changelogFilename = core.getInput("changelog");
    const label = core.getInput("label");
    const dryRun = core.getInput("dryRun");
    const [repoOwner, repoName] = (core.getInput("repoUrl") || "").split("/");

    const workspaces = await getWorkspaceConfig();
    if (!workspaces || !workspaces.length) {
      await ghReleaseChangelog({
        tag,
        fromTag,
        githubToken: token,
        ignoreTests,
        changelogFilename,
        label,
        repoOwner,
        repoName,
        dryRun,
      });
    } else {
      // monorepo
    }

    core.info(new Date().toTimeString());

    core.setOutput("time", new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run().then((err) => {
  core.error(err);
  process.exitCode = 1;
});
