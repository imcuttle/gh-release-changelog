const core = require("@actions/core");
const cp = require("child_process");
const ghReleaseChangelog = require("./gh-release-changelog");
const utils = require("./utils");

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
    core.debug(new Date().toTimeString()); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    const token = core.getInput("token", { required: true });
    const tag =
      core.getInput("tag") || exec(`git describe --abbrev=0 --tags HEAD`);
    if (!tag) {
      throw new Error("tag is required");
    }
    const fromTag = core.getInput("fromTag");
    const ignoreTests = core.getInput("ignoreTests");
    const changelogFilename = core.getInput("changelog");
    const label = core.getInput("label");
    const dryRun = core.getInput("dryRun");
    const checkStandardVersion = core.getInput("checkStandardVersion");
    const initialDepth = core.getInput("initialDepth");
    const draft = core.getInput("draft");
    const checkPkgAvailable =
      core.getInput("checkPkgAvailable") == null
        ? true
        : core.getInput("checkPkgAvailable");
    const [repoOwner, repoName] = (core.getInput("repoUrl") || "").split("/");

    const tagParsed = utils.parserVersion(tag);
    if (!tagParsed) {
      core.warning(`tag "${tag}" is ignored.`);
      return;
    }
    if (fromTag) {
      const fromTagParsed = utils.parserVersion(fromTag);
      if (!fromTagParsed) {
        core.warning(`fromTag "${fromTag}" is ignored.`);
        return;
      }
    }

    const workspaces = await utils.getWorkspaceConfig();
    const options = {
      initialDepth,
      draft,
      checkPkgAvailable,
      checkStandardVersion,
      tag,
      fromTag,
      githubToken: token,
      ignoreTests,
      changelogFilename,
      label,
      repoOwner,
      repoName,
      dryRun,
    };
    core.debug("Input Options:\n" + JSON.stringify(options, null, 2));
    if (options.checkStandardVersion && !utils.isStandardVersion(tag)) {
      core.warning(
        `${tag} is not a standard version, so skip it. you can pass checkStandardVersion=false for skipping the checker`
      );
      return;
    }

    if (!workspaces || !workspaces.length) {
      const result = await ghReleaseChangelog(options);
      if (dryRun) {
        core.info(JSON.stringify(result, null, 2));
      }
    } else {
      // monorepo
    }

    core.debug(new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
