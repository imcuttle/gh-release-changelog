const github = require("@actions/github");
const cp = require("child_process");
const nps = require("path");
const fs = require("fs");
const globby = require("globby");
const { sync: visitTree } = require("@moyuyc/visit-tree");
const remark = require("remark");
const { promisify } = require("util");
const nodeToString = require("mdast-util-to-string");
const _readJSON = require("read-json-file");
const utils = require("./utils");
const readJSON = promisify(_readJSON);

const execSyncStdout = (cmd) => {
  try {
    return cp.execSync(cmd).toString().trim();
  } catch (e) {
    return undefined;
  }
};

const isMatchedTag = (heading, tag) => {
  const normalizedTag = tag.replace(/^v/, "");
  return (
    utils.isVersionText(heading) &&
    (heading.startsWith(normalizedTag) || heading.startsWith(tag))
  );
};

const defaultIgnoreTests = [/^<a name=.*><\/a>/, /^\s*Note: Version bump only/];

async function ghReleaseChangelog({
  changelogFilename,
  cwd = process.cwd(),
  tag = execSyncStdout(`git describe --abbrev=0 --tags HEAD`),
  fromTag,
  dryRun,
  githubToken,
  repoOwner,
  repoName,
  ignoreTests = defaultIgnoreTests,
  draft = false,
  label,
  skipEnvGithubRepoInfer,
  initialDepth = 4,
  checkPkgAvailable = false,
  checkStandardVersion = true,
}) {
  if (!tag) {
    throw new Error(`tag is required`);
  }
  if (checkStandardVersion && !utils.isStandardVersion(tag)) {
    throw new Error(`tag "${tag}" is not a standard version`);
  }

  if (checkPkgAvailable) {
    const pkg = await utils.getPkg(cwd);
    if (!pkg) {
      throw new Error(`CheckPkgAvailable package is not found`);
    }
    const spec = pkg.version ? `${pkg.name}@${pkg.version}` : pkg.name;
    if (!(await utils.checkPackageAvailable(spec))) {
      throw new Error(`CheckPkgAvailable ${spec} is unpublished`);
    }
  }

  if (!changelogFilename) {
    const files = await globby(
      ["changelog.md", "release.md", "release-note.md", "release-notes.md"],
      {
        cwd,
        onlyFiles: true,
        caseSensitiveMatch: false,
        deep: 1,
        absolute: true,
      }
    );
    changelogFilename = files[0];
  }
  if (!changelogFilename) {
    throw new Error(`"changelogFilename" is required`);
  }

  [repoOwner, repoName] = await utils.inferRepoInfo(repoOwner, repoName, {
    skipEnvGithubRepoInfer,
    cwd,
  });
  if (!repoOwner) {
    throw new Error(`"repoOwner" is required`);
  }
  if (!repoName) {
    throw new Error(`"repoName" is required`);
  }

  changelogFilename = nps.resolve(cwd, changelogFilename);
  const changelog = await fs.promises.readFile(changelogFilename, "utf-8");

  const nodes = [];
  let depth;
  const h = remark().use(() => {
    return (gnode) => {
      visitTree(gnode, (node, ctx) => {
        if (node.type === "heading") {
          const heading = nodeToString(node).trim();
          if (isMatchedTag(heading, tag)) {
            // depth = initialDepth
            // add next Siblings which is not version heading
            let index = ctx.index + 1;
            while (true) {
              const nextNode = ctx.parent.children[index];
              index++;
              if (!nextNode) {
                break;
              }

              const text = nodeToString(nextNode);
              if (
                nextNode.type !== "heading" ||
                !utils.isVersionText(text) ||
                (fromTag && !isMatchedTag(text, fromTag))
              ) {
                if (!fromTag && nextNode.type === "heading") {
                  const tmp = utils.parserVersion(text);
                  if (tmp && tmp.version) {
                    fromTag = tmp.version;
                  }
                }

                if (nextNode.type === "heading") {
                  if (nextNode.depth > 1) {
                    depth = Math.min(
                      depth || Number.MAX_VALUE,
                      nextNode.depth - 1
                    );
                  }
                }

                if (ignoreTests.some((rule) => rule.test(text))) {
                  continue;
                }
                nodes.push(nextNode);
              } else {
                break;
              }
            }
            depth = depth || initialDepth;
            ctx.break();
          }
        }
      });
    };
  });
  await h.process(changelog);

  let releaseNote = nodes
    .map((node) => remark().stringify(node))
    .join("\n")
    .trim();
  if (releaseNote) {
    let url;
    if (fromTag) {
      url = `https://github.com/${repoOwner}/${repoName}/compare/${fromTag}...${tag}`;
    } else {
      url = `https://github.com/${repoOwner}/${repoName}/commits/${tag}`;
    }
    releaseNote = releaseNote + `\n\nFull Changelog: [${tag}](${url})`;

    if (depth && label) {
      releaseNote = "#".repeat(depth) + ` ${label}\n\n` + releaseNote;
    }
  }

  if (dryRun) {
    return {
      releaseNote: releaseNote.trim(),
      changelogFilename,
      githubToken,
      repoOwner,
      repoName,
      tag,
      fromTag,
      label,
      depth,
    };
  } else {
    if (!releaseNote.trim()) {
      return;
    }
    return utils.releaseGitHub({
      repoOwner,
      repoName,
      draft,
      tag,
      githubToken,
      releaseNote,
    });
  }
}

module.exports = ghReleaseChangelog;
