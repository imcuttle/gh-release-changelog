const cp = require("child_process");
const fs = require("fs");
const nps = require("path");
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

// exports.checkPackageAvailable("npm@5").then(console.log, console.error);
