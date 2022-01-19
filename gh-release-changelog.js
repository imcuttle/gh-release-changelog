const github = require("@actions/github");
const cp = require("child_process");
const nps = require("path");
const fs = require("fs");
const globby = require("globby");
const visitTree = require("@moyuyc/visit-tree");
const remark = require("remark");
const nodeToString = require("mdast-util-to-string");
const escapeReg = require("escape-string-regexp");
const utils = require("./utils");

const execSyncStdout = (cmd) => {
  try {
    return cp.execSync(cmd, { stdio: "pipe" }).toString().trim();
  } catch (e) {
    return undefined;
  }
};

const isMatchedTag = (heading, tag) => {
  return (
    utils.isVersionText(heading) &&
    utils.parserVersion(heading).version === utils.parserVersion(tag).version
  );
};

const defaultIgnoreTests = [/^<a name=.*><\/a>/, /^\s*Note: Version bump only/];

async function ghReleaseChangelog({
  changelogFilename,
  cwd = process.cwd(),
  tag = execSyncStdout(`git describe --abbrev=0 --tags HEAD`),
  fromTag,
  dryRun,
  splitNote,
  githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_AUTH,
  repoOwner,
  repoName,
  ignoreTests = defaultIgnoreTests,
  draft = false,
  label,
  skipEnvGithubRepoInfer,
  skipFromTagGitInfer,
  initialDepth = 4,
  checkPkgAvailable = false,
  checkStandardVersion = true,
  extraReleaseData,
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
    const { version } = utils.parserVersion(tag) || {};
    const spec = version ? `${pkg.name}@${version}` : pkg.name;
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
  const parsed = utils.parserVersion(tag);
  const nodes = [];
  let depth;
  const h = remark().use(() => {
    return async (gnode) => {
      let breakNode;
      await visitTree(
        gnode,
        async (node, ctx) => {
          if (node.type === "heading" && !breakNode) {
            const heading = nodeToString(node).trim();
            if (isMatchedTag(heading, tag)) {
              // depth = initialDepth
              // add next Siblings which is not version heading
              let index = ctx.index + 1;
              let nextNode;
              while (true) {
                nextNode = ctx.parent.children[index];
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
                  nodes.push(
                    ((i) => ctx.parent.children[i]).bind(null, index - 1)
                  );
                } else {
                  if (!fromTag && nextNode.type === "heading") {
                    const tmp = utils.parserVersion(text);
                    if (tmp && tmp.version && githubToken) {
                      const octokit = github.getOctokit(githubToken);
                      const data =
                        (
                          (await octokit.request(
                            "GET /repos/{owner}/{repo}/git/matching-refs/{ref}",
                            {
                              ref: "tags",
                              owner: repoOwner,
                              repo: repoName,
                            }
                          )) || {}
                        ).data || [];
                      data.reverse();
                      const tags = data.map((x) =>
                        x.ref.replace(/^refs\/tags\//, "")
                      );
                      const matchedTag = tags.find((tag) => {
                        return (
                          parsed.name
                            ? new RegExp(
                                `^${escapeReg(parsed.name + "@")}${escapeReg(
                                  tmp.version
                                )}$`
                              )
                            : new RegExp(`^[vV]?${escapeReg(tmp.version)}$`)
                        ).test(tag);
                      });
                      if (matchedTag) {
                        utils.githubActionLogger.info(
                          `Inferred fromTag "${matchedTag}" from ${tmp.version}`
                        );
                        fromTag = matchedTag;
                      } else {
                        utils.githubActionLogger.warning(
                          `Inferred fromTag failed from\n${JSON.stringify(
                            {
                              tags,
                              version: tmp.version,
                            },
                            null,
                            2
                          )}`
                        );
                      }
                    }
                  }
                  break;
                }
              }
              depth = depth || initialDepth;

              breakNode = nextNode || node;
            }
          }
        },
        async (node, ctx) => {
          if (node.type === "link") {
            const plainText = nodeToString(node);
            if (
              // @person
              (/^@[\w-]+$/.test(plainText) &&
                /^https?:\/\/github.com\/[\w-]+/.test(node.url)) ||
              // #123, a/b#123 a#123
              (/^([\w-]+(\/[\w-]+)?)?#\d+$/.test(plainText) &&
                /^https?:\/\/github.com\/[\w-]+\/[\w-]+\/(issues|pull)\/\d+/.test(
                  node.url
                ))
            ) {
              ctx.replace({
                type: "text",
                value: plainText,
              });
            }
          }
          if (breakNode && node === breakNode) {
            ctx.break();
          }
        }
      );
    };
  });
  await h.process(changelog);

  let releaseNote = nodes
    .map((fn) => fn())
    .map((node) => remark().stringify(node))
    .join("\n")
    .trim();

  let url;
  if (!skipFromTagGitInfer) {
    fromTag =
      fromTag ||
      (tag && execSyncStdout(`git describe --abbrev=0 --tags ${tag}^`));
  }
  if (fromTag) {
    url = `https://github.com/${repoOwner}/${repoName}/compare/${fromTag}...${tag}`;
  } else {
    url = `https://github.com/${repoOwner}/${repoName}/commits/${tag}`;
  }

  const head = depth && label ? "#".repeat(depth) + ` ${label}` : null;
  const tail = `**Full Changelog**: ${url}`;
  releaseNote = releaseNote.trim();
  if (releaseNote) {
    releaseNote = [head || "", releaseNote, !splitNote ? tail || "" : null]
      .filter(Boolean)
      .join("\n\n");
  }

  if (dryRun) {
    return {
      releaseNote,
      tail,
      head,
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
      utils.githubActionLogger.warning(`releaseNote is empty`);
      return;
    }
    return utils.releaseGitHub({
      ...extraReleaseData,
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
module.exports.defaultIgnoreTests = defaultIgnoreTests;
