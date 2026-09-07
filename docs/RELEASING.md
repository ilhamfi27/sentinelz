# Releasing

Versioning, git tagging, and npm publishing are fully automated via [semantic-release](https://semantic-release.org), driven by [Conventional Commits](https://www.conventionalcommits.org) on `main`. There is no manual version bump, no manual `npm publish`, no manual git tag.

## How it works

1. `.github/workflows/ci.yml` runs on every push and PR: build, unit tests, integration tests (Postgres/MySQL/MongoDB/Redis as GitHub Actions service containers).
2. `.github/workflows/release.yml` runs after CI succeeds on `main` (via `workflow_run`), and executes `semantic-release`:
   - Inspects every commit since the last release.
   - Computes the next semver version from commit types (see below).
   - Updates `CHANGELOG.md` and the `version` field in `package.json`.
   - Publishes to npm.
   - Creates a GitHub Release and a `vX.Y.Z` git tag.
   - Commits the version bump + changelog back to `main` (message includes `[skip ci]` so it doesn't re-trigger CI).
3. If no commit since the last release warrants a version bump (e.g. only `docs:`/`chore:` commits), nothing is published — this is normal, not a failure.

## Commit message convention

The commit-analyzer plugin uses the default Angular preset:

| Prefix | Version bump |
| --- | --- |
| `fix: ...` | patch (0.1.0 → 0.1.1) |
| `feat: ...` | minor (0.1.0 → 0.2.0) |
| `feat!: ...` or a footer with `BREAKING CHANGE: ...` | major (0.1.0 → 1.0.0) |
| `docs:`, `chore:`, `refactor:`, `test:`, `style:`, `ci:`, `build:` | no release |

## Required setup (one-time, manual — outside what I can do from here)

- **`NPM_TOKEN`** repo secret: an npm [Automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens) with publish access to the `sentinelz` package, added under repo **Settings → Secrets and variables → Actions**.
- **`GITHUB_TOKEN`**: provided automatically by GitHub Actions — no setup needed, but the repo's **Settings → Actions → General → Workflow permissions** must allow "Read and write permissions" so `@semantic-release/git` can push the release commit and `@semantic-release/github` can create releases.
- A GitHub remote for this repo (`git remote add origin <url>` + push `main`) — without this, `semantic-release` cannot determine `repositoryUrl` (confirmed locally: `.releaserc.json` and all 5 plugins load correctly, it only fails on the missing remote).

## Local dry-run (no publish, no push)

```bash
npx semantic-release --dry-run --no-ci
```

Useful for validating config changes before pushing.
