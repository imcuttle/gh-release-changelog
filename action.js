const core = require('@actions/core')
const cp = require('child_process')
const { ghReleaseChangelogAnyway, ghReleaseChangelog } = require('.')
const utils = require('./utils')

const exec = (cmd, silent = true) => {
  try {
    return cp.execSync(cmd, { stdio: 'pipe' }).toString().trim()
  } catch (err) {
    if (!silent) {
      core.warning(err)
    }
  }
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    core.debug(new Date().toTimeString()) // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    const token = core.getInput('token', { required: true })
    const tag = core.getInput('tag') || exec(`git describe --abbrev=0 --tags HEAD`)
    if (!tag) {
      core.warning('tag is required')
      return
    }
    const fromTag = core.getInput('fromTag')
    const ignoreTests = (core.getMultilineInput('inputTests') || [])
      .map((x) => new RegExp(x))
      .concat(ghReleaseChangelog.defaultIgnoreTests)
    const changelogFilename = core.getInput('changelog')
    const label = core.getInput('label')
    const dryRun = core.getBooleanInput('dryRun')
    const generate_release_notes = core.getBooleanInput('generate_release_notes')
    const prerelease = core.getBooleanInput('prerelease')
    const discussion_category_name = core.getInput('discussion_category_name')
    const checkStandardVersion = core.getBooleanInput('checkStandardVersion')
    const initialDepth = Number(core.getInput('initialDepth'))
    const draft = core.getBooleanInput('draft')
    const checkPkgAvailable = core.getBooleanInput('checkPkgAvailable')
    let [repoOwner, repoName] = (core.getInput('repoUrl') || '').split('/')
    ;[repoOwner, repoName] = await utils.inferRepoInfo(repoOwner, repoName, {
      skipEnvGithubRepoInfer: false
    })

    const tagParsed = utils.parserVersion(tag)
    if (!tagParsed) {
      core.warning(`tag "${tag}" is ignored.`)
      return
    }
    if (fromTag) {
      const fromTagParsed = utils.parserVersion(fromTag)
      if (!fromTagParsed) {
        core.warning(`fromTag "${fromTag}" is ignored.`)
        return
      }
    }

    const workspaces = await utils.getWorkspaceConfig()
    const options = {
      initialDepth,
      draft,
      checkPkgAvailable,
      checkStandardVersion,
      tag,
      fromTag,
      githubToken: token,
      ignoreTests,
      changelogFilename,
      label,
      repoOwner,
      repoName,
      dryRun,
      extraReleaseData: {
        prerelease,
        discussion_category_name,
        generate_release_notes
      }
    }
    core.info('Input Options:\n' + JSON.stringify(options, null, 2))
    if (options.checkStandardVersion && !utils.isStandardVersion(tag)) {
      core.warning(
        `${tag} is not a standard version, so skip it. you can pass checkStandardVersion=false for skipping the checker`
      )
      return
    }

    const result = await ghReleaseChangelogAnyway({
      ...options,
      logger: core
    })
    if (dryRun) {
      core.info(`dryRun result: ` + JSON.stringify(result, null, 2))
    }
    core.debug(new Date().toTimeString())
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
