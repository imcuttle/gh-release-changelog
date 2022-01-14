const { ghReleaseChangelog, ghReleaseChangelogMonorepo } = require("./");
const path = require("path");
const { testCreateRelease } = require("@actions/github");

process.env.GITHUB_TOKEN = 'noop'

const fixture = (name) => path.resolve(__dirname, "fixture", name);

jest.mock("@actions/github", () => {
  const testCreateRelease = jest.fn(() => {});
  return {
    testCreateRelease,
    getOctokit: () => {
      return {
        repos: {
          createRelease: testCreateRelease,
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
    const data = await ghReleaseChangelog({
      cwd: fixture("valid"),
      tag: "v1.0.0",
      githubToken: "noop",
      label: "@rcp/abc",
      skipEnvGithubRepoInfer: true,
    });

    expect(testCreateRelease).toHaveBeenCalledTimes(1);
    expect(testCreateRelease.mock.calls[0]).toMatchSnapshot();
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
      repoName: 'a',
      repoOwner: 'o',
    });
    expect(testCreateRelease).toHaveBeenCalledTimes(1);
    expect(testCreateRelease.mock.calls[0]).toMatchSnapshot();
  });
});
