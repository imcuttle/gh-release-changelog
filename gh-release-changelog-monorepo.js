const { makeFileFinder } = require("@lerna/project/lib/make-file-finder");
const loadJsonFile = require("load-json-file");
const { Package } = require("@lerna/package");
const pMap = require("p-map");
const path = require("path");
const pick = require("lodash.pick");
const cp = require("child_process");

const execSyncStdout = (cmd) => {
  try {
    return cp.execSync(cmd, { stdio: "pipe" }).toString().trim();
  } catch (e) {
    return undefined;
  }
};

const utils = require("./utils");
const release = require("./gh-release-changelog");

module.exports = async function ghReleaseChangelogMonorepo({
  workspaces,
  dryRun,
  cwd = process.cwd(),
  tag = execSyncStdout(`git describe --abbrev=0 --tags HEAD`),
  ...releaseConfig
}) {
  if (!workspaces) {
    workspaces = await utils.getWorkspaceConfig(cwd);
  }
  if (!workspaces) {
    throw new Error(`workspaces is required`);
  }

  const mapper = (packageConfigPath) =>
    loadJsonFile(packageConfigPath).then(
      (packageJson) =>
        new Package(packageJson, path.dirname(packageConfigPath), cwd)
    );

  let packages = await makeFileFinder(cwd, workspaces)(
    "package.json",
    (filePaths) => pMap(filePaths, mapper, { concurrency: 50 })
  );
  packages = packages.filter((pkg) => !pkg.private);

  if (!tag) {
    throw new Error(`tag is required`);
  }
  const parsed = utils.parserVersion(tag);
  if (!parsed) {
    throw new Error(`tag "${tag}" is not a valid version`);
  }

  let releaseNotes = [];
  const releasePkg = async (pkg) => {
    return pick(
      {
        ...(await release({
          tag,
          ...releaseConfig,
          cwd: pkg.location,
          splitNote: true,
          changelogFilename:
            !releaseConfig.changelogFilename ||
            !path.isAbsolute(releaseConfig.changelogFilename)
              ? releaseConfig.changelogFilename
              : undefined,
          dryRun: true,
          label: pkg.name,
        })),
        pkg,
      },
      ["changelogFilename", "releaseNote", "head", "tail"]
    );
  };
  if (parsed.name) {
    // independent
    const pkg = packages.find((pkg) => pkg.name === parsed.name);
    if (!pkg) {
      throw new Error(`tag ${tag} does not match pkg`);
    }
    releaseNotes.push(await releasePkg(pkg));
  } else {
    const promises = packages.map(async (pkg) => releasePkg(pkg));
    const dataList = await Promise.all(promises);

    // All is empty
    if (dataList.every((d) => !d.releaseNote)) {
      releaseNotes.push(
        await releasePkg({
          name: null,
          location: cwd,
        })
      );
    } else {
      releaseNotes.push(...dataList);
    }
  }

  releaseNotes = releaseNotes.filter((r) => !!r.releaseNote);
  if (dryRun) {
    if (!releaseNotes.length) {
      utils.githubActionLogger.warning(`Fallback to using root changelog.`);
      return release({
        ...releaseConfig,
        dryRun,
        cwd,
        tag,
      });
    }
    return {
      releaseNotes,
      workspaces,
    };
  } else {
    if (!releaseNotes.length) {
      utils.githubActionLogger.warning(`Fallback to using root changelog.`);
      return release({
        ...releaseConfig,
        cwd,
        tag,
      });
    }
    const [repoOwner, repoName] = await utils.inferRepoInfo(
      releaseConfig.repoOwner,
      releaseConfig.repoName,
      {
        cwd,
        skipEnvGithubRepoInfer: releaseConfig.skipEnvGithubRepoInfer,
      }
    );
    return utils.releaseGitHub({
      ...releaseConfig,
      repoOwner,
      repoName,
      tag,
      releaseNote: releaseNotes
        .map((r) => r.releaseNote)
        .concat(releaseNotes[0].tail)
        .filter(Boolean)
        .join("\n\n"),
    });
  }
};
