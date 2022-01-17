# gh-release-changelog

<a href="https://github.com/imcuttle/gh-release-changelog/actions"><img alt="javscript-action status" src="https://github.com/imcuttle/gh-release-changelog/workflows/CI/badge.svg"></a>

Create GitHub Release from changelog and tag push.

**Supports monorepo(lerna/pnpm/npm) and normal repo**

![image](https://user-images.githubusercontent.com/13509258/149616401-be259428-117a-4e64-a169-b1e698aba928.png)

`CHANGELOG.md` syntax likes like:

```md
## [1.0.3](https://github.com/imcuttle/gh-release-changelog/compare/v1.0.2...v1.0.3) (2022-01-15)

### Bug Fixes

- release note generate ([ca47484](https://github.com/imcuttle/gh-release-changelog/commit/ca474849b15a56e74af9165cc193cb1c960f93a6))

## [1.0.2](https://github.com/imcuttle/gh-release-changelog/compare/v1.0.2-beta.3...v1.0.2) (2022-01-15)

## [1.0.2-beta.1](https://github.com/imcuttle/gh-release-changelog/compare/v1.0.2-beta.0...v1.0.2-beta.1) (2022-01-15)

...
```

### Monorepo

Supports lerna independent (eg. `foo@1.0.0`) and fixed (eg. `v1.0.0`) version mode.

```bash
root/
  packages/
    foo/
      package.json
      CHANGELOG.md # use it firstly
    bar/
      package.json
      CHANGELOG.md # use it firstly
  lerna.json # or pnpm-workspace.yaml, workspaces on `package.json`
  package.json
  CHANGELOG.md # fallback to use it
```

### Normal Repo

```bash
root/
  package.json
  CHANGELOG.md # use it
```

## Usage

```yaml
# ci.yml
name: "CI"
on:
  - push
  - pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: env
      - run: npm ci
      - run: npm test
  gh-release-changelog:
    runs-on: ubuntu-latest
    needs: [test]
    steps:
      - uses: actions/checkout@v2
      - uses: imcuttle/gh-release-changelog@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Action Inputs

##### `token`

GitHub Token

- **Required**
- **Type**: `string`

##### `tag`

Release tag. Get HEAD tag by default.

- **Optional**
- **Type**: `string`

##### `fromTag`

The start tag. inferred it by CHANGELOG.md by default.

- **Optional**
- **Type**: `string`

##### `changelog`

The changelog filename, inferred it by `CHANGELOG.md/release.md` by default.

- **Optional**
- **Type**: `string`

##### `checkPkgAvailable`

Whether check package `name@version` is available

- **Optional**
- **Type**: `boolean`
- **Default**: `true`

##### `checkStandardVersion`

Whether check standard version tag. (eg. `v1.0.0`, and `v1.0.0-0` is invalid)

- **Optional**
- **Type**: `boolean`
- **Default**: `false`

##### `draft / prerelease / generate_release_notes / discussion_category_name`

GitHub creates a release [params](https://docs.github.com/en/rest/reference/releases#create-a-release)
