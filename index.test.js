const ghReleaseChangelog = require("./gh-release-changelog");
const process = require("process");
const cp = require("child_process");
const path = require("path");

test("ghReleaseChangelog", async () => {
  const data = await ghReleaseChangelog({
    cwd: path.resolve("fixture"),
    tag: "v1.0.0",
    dryRun: true,
    githubToken: "noop",
    label: "@rcp/abc",
  });
  expect(data).toMatchInlineSnapshot(`
    Object {
      "changelogFilename": "/Users/congyu/github/gh-release-changelog/fixture/CHANGELOG.md",
      "fromTag": undefined,
      "githubToken": "noop",
      "label": "@rcp/abc",
      "releaseNote": "## @rcp/abc

    ### Bug Fixes

    *   should remove container firstly ([4e0d087](https://github.com/imcuttle/rcp/commit/4e0d087))
    *   should remove container firstly ([8dfcc84](https://github.com/imcuttle/rcp/commit/8dfcc84))
    *   use extendDictionary ([330edf0](https://github.com/imcuttle/rcp/commit/330edf0))
    *   use.fetcher with key ([fe45ac1](https://github.com/imcuttle/rcp/commit/fe45ac1))
    *   use.i18ncontext ([da70207](https://github.com/imcuttle/rcp/commit/da70207))

    ### Features

    *   add c.preventfastop ([44bf84f](https://github.com/imcuttle/rcp/commit/44bf84f))
    *   add eq option ([631dfe7](https://github.com/imcuttle/rcp/commit/631dfe7))
    *   add hook ([300eb94](https://github.com/imcuttle/rcp/commit/300eb94))
    *   add use.i18n ([8f2b256](https://github.com/imcuttle/rcp/commit/8f2b256))
    *   allow customized eq function ([79e92ce](https://github.com/imcuttle/rcp/commit/79e92ce))
    *   remove global option ([55f611a](https://github.com/imcuttle/rcp/commit/55f611a))
    *   use es6 instead of es5 ([3dcc2a8](https://github.com/imcuttle/rcp/commit/3dcc2a8))
    *   util.createlogger log alias to info ([8757ae8](https://github.com/imcuttle/rcp/commit/8757ae8))

    ### Performance Improvements

    *   set defaultLanguage to defaultProps ([cf01859](https://github.com/imcuttle/rcp/commit/cf01859))

    ### BREAKING CHANGES

    *   use es6 instead of es5
    *   remove global option

    Full Changelog: [v1.0.0](https://github.com/imcuttle/rcp/commits/v1.0.0)",
      "repoName": "rcp",
      "repoOwner": "imcuttle",
      "tag": "v1.0.0",
    }
  `);
});

// shows how the runner will run a javascript action with env / stdout protocol
test("test runs", () => {
  process.env["INPUT_MILLISECONDS"] = 100;
  const ip = path.join(__dirname, "index.js");
  const result = cp.execSync(`node ${ip}`, { env: process.env }).toString();
  console.log(result);
});
