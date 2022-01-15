# gh-release-changelog

<a href="https://github.com/imcuttle/gh-release-changelog/actions"><img alt="javscript-action status" src="https://github.com/imcuttle/gh-release-changelog/workflows/ci/badge.svg"></a>

Create GitHub Release from changelog and tag push.

**Supports monorepo(lerna/pnpm/npm) and normal repo**

`CHANGELOG.md` syntax likes like:
```md
## [1.0.3](https://github.com/imcuttle/gh-release-changelog/compare/v1.0.2...v1.0.3) (2022-01-15)


### Bug Fixes

* release note generate ([ca47484](https://github.com/imcuttle/gh-release-changelog/commit/ca474849b15a56e74af9165cc193cb1c960f93a6))



## [1.0.2](https://github.com/imcuttle/gh-release-changelog/compare/v1.0.2-beta.3...v1.0.2) (2022-01-15)



## [1.0.2-beta.3](https://github.com/imcuttle/gh-release-changelog/compare/v1.0.2-beta.2...v1.0.2-beta.3) (2022-01-15)


### Bug Fixes

* some thing 1.0.2-beta.3 [#1](https://github.com/imcuttle/gh-release-changelog/issues/1) [@imcuttle](https://github.com/imcuttle) ([a8bc65c](https://github.com/imcuttle/gh-release-changelog/commit/a8bc65c21d65e0b6a6c3f90bced3647363650112))


### BREAKING CHANGES

* some changes...



## [1.0.2-beta.2](https://github.com/imcuttle/gh-release-changelog/compare/v1.0.2-beta.1...v1.0.2-beta.2) (2022-01-15)


### Bug Fixes

* some thing is fine [#1](https://github.com/imcuttle/gh-release-changelog/issues/1) [@imcuttle](https://github.com/imcuttle) ([02b7bcf](https://github.com/imcuttle/gh-release-changelog/commit/02b7bcf8d55fbdab0055de38f65fea69319be2d4))


### BREAKING CHANGES

* some changes...


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

See the [actions tab](https://github.com/imcuttle/gh-release-changelog) for runs of this action! :rocket:
