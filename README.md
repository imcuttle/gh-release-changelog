# gh-release-changelog

<a href="https://github.com/imcuttle/gh-release-changelog/actions"><img alt="javscript-action status" src="https://github.com/imcuttle/gh-release-changelog/workflows/units-test/badge.svg"></a>

Create GitHub Release from changelog and tag push.

## Usage

```yaml
# gh-release-changelog.yml
name: "gh-release-changelog"
on:
  push:
    tags:
      - "**"
jobs:
  gh-release-changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: imcuttle/gh-release-changelog@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

See the [actions tab](https://github.com/imcuttle/gh-release-changelog) for runs of this action! :rocket:
