const core = require("@actions/core");
const cp = require("child_process");
const { ghReleaseChangelog, ghReleaseChangelogMonorepo } = require(".");
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
      core.warning("tag is required");
      return;
    }
    const fromTag = core.getInput("fromTag");
    const ignoreTests = (core.getMultilineInput("inputTests") || []).map(
      (x) => new RegExp(x)
    );
    const changelogFilename = core.getInput("changelog");
    const label = core.getInput("label");
    const dryRun = core.getBooleanInput("dryRun");
    const checkStandardVersion = core.getBooleanInput("checkStandardVersion");
    const initialDepth = core.getInput("initialDepth");
    const draft = core.getBooleanInput("draft");
    const checkPkgAvailable = core.getBooleanInput("checkPkgAvailable");
    let [repoOwner, repoName] = (core.getInput("repoUrl") || "").split("/");
    [repoOwner, repoName] = utils.inferRepoInfo(repoOwner, repoName, {
      skipEnvGithubRepoInfer: false,
    });

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
    core.info("Input Options:\n" + JSON.stringify(options, null, 2));
    if (options.checkStandardVersion && !utils.isStandardVersion(tag)) {
      core.warning(
        `${tag} is not a standard version, so skip it. you can pass checkStandardVersion=false for skipping the checker`
      );
      return;
    }

    let result;
    if (!workspaces || !workspaces.length) {
      core.info("Run in normal repo");
      result = await ghReleaseChangelog(options);
    } else {
      core.info("Run in monorepo " + workspaces.join(", "));
      result = await ghReleaseChangelogMonorepo({
        ...options,
        workspaces,
      });
    }
    if (dryRun) {
      core.info(`dryRun result: ` + JSON.stringify(result, null, 2));
    }

    core.debug(new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
