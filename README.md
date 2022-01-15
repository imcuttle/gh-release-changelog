# gh-release-changelog

<a href="https://github.com/imcuttle/gh-release-changelog/actions"><img alt="javscript-action status" src="https://github.com/imcuttle/gh-release-changelog/workflows/ci/badge.svg"></a>

Create GitHub Release from changelog and tag push.

**Supports monorepo(lerna/pnpm/npm) and normal repo**

### Monorepo

Supports lerna independent and fixed version mode.

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
# gh-release-changelog.yml
name: "Github Release"
on:
  push:
    tags:
      - "**"
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
