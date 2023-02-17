# ZKFS | Zero-Knowledge File System

[![License](https://badgen.net/github/license/zkfs-io/zkfs)](https://github.com/zkfs-io/zkfs/blob/develop/LICENSE.md)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![release @latest packages](https://github.com/zkfs-io/zkfs/actions/workflows/release-develop.yml/badge.svg)](https://github.com/zkfs-io/zkfs/actions/workflows/release-develop.yml)

### Table of contents

- [Quick start](#quick-start)
- [Contributing](#contributing)
  - [Github Project / issue tracking](#issue-tracking--github-project)
- [Examples](https://github.com/zkfs-io/zkfs/blob/develop/packages/examples/test/counter.test.ts#67)

# Quick start

```zsh
npm i --save @zkfs/contract-api@latest
```

> ⚠️ ZKFS is currently being shipped as a development preview, containing a limited subset of features. As of now, you can use ZKFS in your test suite using @zkfs/contract-api@latest. Next step is to ship a UI development kit, with a fully fledged ZKFS node/peer.

```typescript
import { method, UInt64 } from 'snarkyjs';
import {
  OffchainState,
  offchainState,
  OffchainStateContract,
} from '@zkfs/contract-api';

class Counter extends OffchainStateContract {
  @offchainState() public count = OffchainState.from<UInt64>(UInt64);

  public init() {
    super.init();
    this.count.set(UInt64.from(0));
  }

  @method
  public update() {
    const { value: currentCount } = this.count.get();
    const newCount = currentCount.add(1);
    this.count.set(newCount);
  }
}

export default Counter;
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/zkfs-io/zkfs?embed=1&file=packages/examples/test/counter.test.ts,packages/examples/test/counter.ts&hideExplorer=0&hideNavigation=0&theme=dark&view=editor)

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
  - Releases happen automatically on merge to develop (@alpha releases)

## Issue tracking / Github project

You can keep track of the work being done across all ZKFS repositories in the [ZKFS Github project](https://github.com/orgs/zkfs-io/projects/2).

## Local CI workflow

In order to run github workflows locally, you need to install [`act`](https://github.com/nektos/act). This is especially useful when developing changes to the CI/CD pipeline. Afterwards you should be able to run the following:

```zsh
# run all workflows tied to pull_request(s)
act pull_request
```

## Powered by

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>
