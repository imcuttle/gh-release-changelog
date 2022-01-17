const ghReleaseChangelog = require("./gh-release-changelog");
const ghReleaseChangelogMonorepo = require("./gh-release-changelog-monorepo");
const utils = require("./utils");

module.exports = async function ghReleaseChangelogAnyway({
  logger = {
    info: () => {},
  },
  ...options
} = {}) {
  const workspaces = await utils.getWorkspaceConfig();

  let result;
  if (!workspaces || !workspaces.length) {
    logger && logger.info && logger.info("Run in normal repo");
    result = await ghReleaseChangelog(options);
  } else {
    logger && logger.info && logger.info("Run in monorepo");
    result = await ghReleaseChangelogMonorepo({
      ...options,
      workspaces,
    });
  }
  return result;
};
