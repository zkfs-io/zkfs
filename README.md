# ZKFS | Zero-Knowledge File System

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

### Table of contents

- [Quick start](#quick-start)
- [Contributing](#contributing)

# Quick start

```zsh
npm i --save @zkfs/sdk
```

```typescript
import { ZKFS } from '@zkfs/sdk';

// TBD
```

# Contributing

When contributing, please keep the following in mind:

- Use the [`git flow`](https://danielkummer.github.io/git-flow-cheatsheet/) convention for branch names:
  - `feature/*`
    - Feature branches shall be created only for corresponding issues and named accordingly, such as `feature/#1-development-release-workflow`
  - `develop`
  - `release/<package-name>@<version>` .e.g.: `release/@zkfs/sdk-test@0.0.1`
    - Alternatively, in case of a multi package release, feel free to use an arbitrary release name (release/\*)
- Follow [`commitizen's conventional-changelog`](https://github.com/commitizen/cz-cli) commit message format
  - Use `npm run commit` and you'll be presented with a commitizen prompt walking you through writing the commit message properly.
- Each pull request for the develop branch must pass the underlying workflows for lint/test/build.
- There are a few git hooks configured to help you validate commit contents before pushing:
  - `pre-commit`: validates staged files
  - `pre-push`: validates branch names
- Releases and changelog generation shall happen after merging from `release/*` to `develop`
  - Changelog and semver increments are generated automatically from conventional commits. All commits are included together with a merge commit, so that the changelog and semver can be deducted automatically.
  - Releases happen automatically on merge to develop (@next releases)

## Local CI workflow

In order to run github workflows locally, you need to install [`act`](https://github.com/nektos/act). This is especially useful when developing changes to the CI/CD pipeline. Afterwards you should be able to run the following:

```zsh
# run all workflows tied to pull_request(s)
act pull_request
```

## Powered by

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>
