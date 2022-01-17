#!/usr/bin/env node
const ghReleaseAnyway = require("./gh-release-changelog-anyway");
const pkg = require("./package.json");
const minimist = require("minimist");

const usage = `Usage
  $ gh-release-changelog
Options
  --draft
  --prerelease
  --discussion_category_name
  --generate_release_notes
  --repoOwner
  --repoName
  --checkStandardVersion
  --checkPkgAvailable
  --label
  --changelogFilename
  --tag
  --fromTag
  --githubToken
  --dryRun
  --version, -v
  --help, -h
  --silent
Examples
  $ gh-release-changelog`;

function run(args) {
  // Version
  if (args.includes("--version") || args.includes("-v")) {
    return console.log(pkg.version);
  }

  if (args.includes("--help") || args.includes("-h")) {
    return console.log(usage);
  }

  const flags = minimist(args) || {};
  const logger = {
    info: (...args) => {
      !flags.silent && console.log(...args);
    },
  };

  logger.info("flags", flags);
  return ghReleaseAnyway({
    ...flags,
    logger,
  }).then((data) => {
    if (flags.dryRun) {
      console.log(JSON.stringify(data, null, 2));
    }
  });
}

const [, , ...args] = process.argv;
run(args).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
