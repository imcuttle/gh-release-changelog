const { makeFileFinder } = require("@lerna/project/lib/make-file-finder");
const loadJsonFile = require("load-json-file");
const { Package } = require("@lerna/package");
const pMap = require("p-map");
const path = require("path");
const pick = require("lodash.pick");

const utils = require("./utils");
const release = require("./gh-release-changelog");

module.exports = async function ghReleaseChangelogMonorepo({
  workspaces,
  dryRun,
  cwd = process.cwd(),
  tag,
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

  const packages = await makeFileFinder(cwd, workspaces)(
    "package.json",
    (filePaths) => pMap(filePaths, mapper, { concurrency: 50 })
  );

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
      ["changelogFilename", "releaseNote"]
    );
  };
  if (parsed.name) {
    // independent
    const pkg = packages.find((pkg) => pkg.name === parsed.name);
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
    return {
      releaseNotes,
      workspaces,
    };
  } else {
    if (!releaseNotes.length) {
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
      releaseNote: releaseNotes.map((r) => r.releaseNote).join("\n\n"),
    });
  }
};
