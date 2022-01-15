const { ghReleaseChangelog, ghReleaseChangelogMonorepo } = require("./");
const utils = require("./utils");
const path = require("path");
const { testCreateRelease } = require("@actions/github");

process.env.GITHUB_TOKEN = "noop";

const fixture = (name) => path.resolve(__dirname, "fixture", name);

jest.mock("@actions/github", () => {
  const testCreateRelease = jest.fn(() => {});
  return {
    testCreateRelease,
    getOctokit: () => {
      return {
        request: (url, params) => {
          return testCreateRelease(params);
        },
      };
    },
  };
});

beforeEach(() => {
  testCreateRelease.mockClear();
});

describe("ghReleaseChangelog", () => {
  test("valid", async () => {
    await ghReleaseChangelog({
      cwd: fixture("valid"),
      tag: "2.0.0",
      githubToken: "noop",
      label: "@rcp/abc",
      skipEnvGithubRepoInfer: true,
    });

    expect(testCreateRelease).toHaveBeenCalledTimes(2);
    expect(testCreateRelease.mock.calls).toMatchSnapshot();
  });
  test("valid-long v1.0.2", async () => {
    await ghReleaseChangelog({
      cwd: fixture("valid-long"),
      tag: "v1.0.2",
      githubToken: "noop",
      skipEnvGithubRepoInfer: true,
      repoName: "gh-release-changelog",
      repoOwner: "imcuttle",
      checkStandardVersion: true,
      checkPkgAvailable: true,
    });

    expect(testCreateRelease.mock.calls).toMatchSnapshot();
    expect(testCreateRelease).toHaveBeenCalledTimes(1);
  });

  test("valid-long v1.0.2-beta.3", async () => {
    await ghReleaseChangelog({
      cwd: fixture("valid-long"),
      tag: "v1.0.2-beta.3",
      githubToken: "noop",
      skipEnvGithubRepoInfer: true,
      repoName: "gh-release-changelog",
      repoOwner: "imcuttle",
      checkStandardVersion: false,
      checkPkgAvailable: true,
    });

    expect(testCreateRelease.mock.calls).toMatchSnapshot();
    expect(testCreateRelease).toHaveBeenCalledTimes(2);
  });

  test("lerna-sub not-found", async () => {
    await ghReleaseChangelog({
      cwd: fixture("lerna-sub"),
      tag: "v1.0.0",
      githubToken: "noop",
      label: "@rcp/abc",
      skipEnvGithubRepoInfer: true,
    });
    expect(testCreateRelease).toHaveBeenCalledTimes(0);
  });

  test("lerna-sub version bump only", async () => {
    await ghReleaseChangelog({
      cwd: fixture("lerna-sub"),
      tag: "v1.0.1",
      githubToken: "noop",
      label: "@rcp/abc",
      skipEnvGithubRepoInfer: true,
    });
    expect(testCreateRelease).toHaveBeenCalledTimes(0);
  });
});

describe("ghReleaseChangelogMonorepo", () => {
  it("lerna", async function () {
    await ghReleaseChangelogMonorepo({
      cwd: fixture("monorepo/lerna"),
      tag: "1.0.0",
      repoName: "a",
      repoOwner: "o",
    });
    expect(testCreateRelease).toHaveBeenCalledTimes(1);
    expect(testCreateRelease.mock.calls[0]).toMatchSnapshot();
  });

  it("pnpm", async function () {
    await ghReleaseChangelogMonorepo({
      cwd: fixture("monorepo/pnpm"),
      repoName: "a",
      repoOwner: "o",
      tag: "1.0.0",
    });
    expect(testCreateRelease).toHaveBeenCalledTimes(1);
    expect(testCreateRelease.mock.calls[0]).toMatchSnapshot();
  });

  it("workspaces", async function () {
    await ghReleaseChangelogMonorepo({
      cwd: fixture("monorepo/workspaces"),
      repoName: "a",
      repoOwner: "o",
      tag: "1.0.0",
    });
    expect(testCreateRelease).toHaveBeenCalledTimes(1);
    expect(testCreateRelease.mock.calls[0]).toMatchSnapshot();
  });

  it("same-version-root-changelog", async function () {
    await ghReleaseChangelogMonorepo({
      cwd: fixture("monorepo/same-version-root-changelog"),
      tag: "1.0.0",
      repoName: "a",
      repoOwner: "o",
    });
    expect(testCreateRelease).toHaveBeenCalledTimes(1);
    expect(testCreateRelease.mock.calls[0]).toMatchSnapshot();
  });
});

describe("utils", () => {
  it("parserVersion", function () {
    expect(utils.parserVersion("v1.0.2-beta.2")).toMatchInlineSnapshot(`
      Object {
        "version": "1.0.2-beta.2",
      }
    `);
    expect(utils.parserVersion("@rcp/asdsa@1.0.2-beta.2"))
      .toMatchInlineSnapshot(`
      Object {
        "name": "@rcp/asdsa",
        "version": "1.0.2-beta.2",
      }
    `);

    expect(utils.parserVersion("@rcp/asdsa@1.0.2-beta.2 123"))
      .toMatchInlineSnapshot(`
      Object {
        "name": "@rcp/asdsa",
        "version": "1.0.2-beta.2",
      }
    `);
  });
});
