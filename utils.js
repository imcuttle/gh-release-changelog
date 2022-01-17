const cp = require("child_process");
const fs = require("fs");
const nps = require("path");
const github = require("@actions/github");
const core = require("@actions/core");
const { promisify } = require("util");
const readYaml = require("read-yaml-file");
const _readJSON = require("read-json-file");
const readJSON = promisify(_readJSON);

const runCommand = (exports.runCommand = function (command, config = {}) {
  return new Promise((resolve, reject) => {
    const child = cp.exec(command, {
      ...config,
      stdio: "pipe",
    });

    let error;
    child.on("error", (err) => {
      error = err;
    });

    const stdouts = [];
    child.stdout.on("data", (chunk) => {
      stdouts.push(Buffer.from(chunk));
    });

    const stderrs = [];
    child.stderr.on("data", (chunk) => {
      stderrs.push(Buffer.from(chunk));
    });

    child.on("exit", (code) => {
      const data = {
        error,
        exitCode: child.exitCode,
        stdout: Buffer.concat(stdouts).toString(config.encoding || "utf-8"),
        stderr: Buffer.concat(stderrs).toString(config.encoding || "utf-8"),
      };
      if (code !== 0) {
        const err = new Error(
          `Run command \`${command}\` failed with exitCode ${code}.\n${JSON.stringify(
            data,
            null,
            2
          )}`
        );
        Object.assign(err, data);
        reject(err);
        return;
      }
      resolve(data);
    });
  });
});

exports.checkPackageAvailable = async function (spec, config) {
  const result = await runCommand(
    `npm view ${JSON.stringify(spec)} version --json`,
    config
  );

  return !!result.stdout;
};

const existsFile = (exports.existsFile = (filename) => {
  return fs.existsSync(filename) && fs.statSync(filename).isFile();
});

const getPkg = (exports.getPkg = async function (cwd) {
  const pkgPath = nps.join(cwd, "package.json");
  if (existsFile(pkgPath)) {
    return await readJSON(pkgPath);
  }
});

const getWorkspaceConfig = (exports.getWorkspaceConfig = async function (
  cwd = process.cwd()
) {
  const pnpmWorkSpace = nps.join(cwd, "pnpm-workspace.yaml");
  if (existsFile(pnpmWorkSpace)) {
    return (await readYaml(pnpmWorkSpace)).packages;
  }

  const pkg = await getPkg(cwd);
  if (pkg && pkg.workspaces) {
    return pkg.workspaces;
  }

  const lernaPath = nps.join(cwd, "lerna.json");
  if (existsFile(lernaPath)) {
    return (await readJSON(lernaPath)).packages;
  }
});

const versionRegs = [
  /^(\d+\.\d+(?:\.\d+)?\S*)/,
  /^[vV](\d+\.\d+(?:\.\d+)?\S*)/,
  /^(\w+)@(\d+\.\d+(?:\.\d+)?\S*)/,
  /^(@\w+\/\w+)@(\d+\.\d+(?:\.\d+)?\S*)/,
];

const isVersionText = (exports.isVersionText = (text) => {
  return !!parserVersion(text);
});

// 0.0.0
const isStandardVersion = (exports.isStandardVersion = (text) => {
  const data = parserVersion(text);
  if (data) {
    return /^\d+\.\d+(\.\d+)$/.test(data.version);
  }
  return false;
});

const parserVersion = (exports.parserVersion = (text) => {
  text = text.trim();
  for (const reg of versionRegs) {
    const m = text.match(reg);
    if (m) {
      if (m.length === 2) {
        return {
          version: m[1],
        };
      }
      return {
        version: m[2],
        name: m[1],
      };
    }
  }
});

const inferRepoInfo = (exports.inferRepoInfo = async (
  repoOwner,
  repoName,
  { cwd = process.cwd(), skipEnvGithubRepoInfer } = {}
) => {
  if (!repoOwner && !repoName) {
    if (!skipEnvGithubRepoInfer && process.env.GITHUB_REPOSITORY) {
      [repoOwner, repoName] = process.env.GITHUB_REPOSITORY.split("/");
    }
    if (!repoOwner && !repoName) {
      const pkgPath = nps.join(cwd, "package.json");
      if (fs.existsSync(pkgPath) && fs.statSync(pkgPath).isFile()) {
        const pkg = await readJSON(pkgPath);
        let repoUrl = pkg.repository;
        if (repoUrl) {
          if (typeof repoUrl === "object" && repoUrl.url) {
            repoUrl = repoUrl.url;
          }

          const matches = repoUrl.match(
            /(?:https?|git(?:\+ssh)?)(?::\/\/)(?:www\.)?github\.com\/(.+)/i
          );
          if (matches) {
            [repoOwner, repoName] = matches[1]
              .trim()
              .replace(/(\.git)$/, "")
              .split("/");
          } else {
            const matches = repoUrl.match(/^github:(.*)/i);
            if (matches) {
              [repoOwner, repoName] = matches[1].split("/");
            } else {
              [repoOwner, repoName] = repoUrl.split("/");
            }
          }
        }
      }
    }
  }

  return [repoOwner, repoName];
});

const IS_GITHUB_ACTIONS = !!process.env.GITHUB_ACTIONS;
const githubActionLogger = (exports.githubActionLogger = {
  info: (message) => {
    IS_GITHUB_ACTIONS && core.info(message);
  },
  warning: (message) => {
    IS_GITHUB_ACTIONS && core.warning(message);
  },
  error: (message) => {
    IS_GITHUB_ACTIONS && core.error(message);
  },
});

const releaseGitHub = (exports.releaseGitHub = async function ({
  repoOwner,
  repoName,
  draft,
  prerelease,
  discussion_category_name,
  generate_release_notes,
  target_commitish,
  tag,
  accept,
  githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_AUTH,
  releaseNote,
}) {
  if (!releaseNote.trim()) {
    throw new Error(`releaseNote is empty when release github`);
  }
  if (!githubToken) {
    throw new Error(`githubToken is empty when release github`);
  }
  if (!repoName) {
    throw new Error(`repoName is empty when release github`);
  }
  if (!repoOwner) {
    throw new Error(`repoOwner is empty when release github`);
  }
  if (!tag) {
    throw new Error(`tag is empty when release github`);
  }

  const octokit = github.getOctokit(githubToken);
  const data = {
    draft,
    prerelease,
    discussion_category_name: !!discussion_category_name
      ? discussion_category_name
      : undefined,
    generate_release_notes,
    target_commitish,
    accept,
  };
  githubActionLogger.info(
    `Creating github release: ${repoOwner}/${repoName} ${tag}\n${JSON.stringify(
      data
    )}\n\n${releaseNote.trim()}`
  );
  const res = await octokit.request("POST /repos/{owner}/{repo}/releases", {
    owner: repoOwner,
    repo: repoName,
    tag_name: tag,
    body: releaseNote.trim(),
    ...data,
  });
  githubActionLogger.info(`Created!`);
  return res;
});
