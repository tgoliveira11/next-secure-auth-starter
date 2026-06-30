# Publishing `@tgoliveira/secure-auth`

**Manual only.** npm publication and GitHub Releases are never automatic. Agents must not run the publish workflow or `npm publish` without explicit owner approval.

## Release invariant

For every published version `X.Y.Z`:

```text
npm @tgoliveira/secure-auth@X.Y.Z  ⟺  git tag secure-auth-vX.Y.Z  ⟺  GitHub Release secure-auth-vX.Y.Z
```

This repository uses the **`secure-auth-v`** tag prefix (not bare `vX.Y.Z`) because the monorepo may publish other packages later.

The publish workflow must complete all three in one run, or finish missing pieces in **recovery mode** (re-dispatch on `main` after partial failure — no duplicate version bump).

## Who may publish

| Actor | May publish? |
| --- | --- |
| Repository owner | Yes — manual workflow dispatch |
| `github-actions[bot]` | Yes — via `publish-secure-auth.yml` only |
| AI agents / contributors | **No** — unless the owner explicitly requests it |

## Changelog and version selection

| `CHANGELOG.md` `Unreleased` | Workflow behavior |
| --- | --- |
| Has entries | **New release** — bump version from notes, move `Unreleased` into dated section |
| Empty | **Recovery only** — retry npm / tag / GitHub Release for version in `packages/secure-auth/package.json` |

`scripts/prepare-release.mjs` enforces this before any bump:

- Blank `version` input + empty `Unreleased` → recovery mode (`changed=false`, `recovery=true`).
- `patch` / `minor` / `major` / exact version + empty `Unreleased` → **fail early** with a clear error.

Automatic bump rules (when `Unreleased` is non-empty and `version` is blank):

1. `**Breaking:**` in notes → major (or minor while major is `0`).
2. `### Added` has entries → minor.
3. Otherwise → patch.

## Start a release (owner)

1. Ensure `main` is green and `Unreleased` has the release notes.
2. GitHub → **Actions** → **Publish package to npmjs** → **Run workflow** on `main`.
3. Leave `version` blank for automatic bump, or pass `patch`, `minor`, `major`, or exact `x.y.z`.

```bash
gh workflow run publish-secure-auth.yml --ref main
gh workflow run publish-secure-auth.yml --ref main -f version=patch
```

## Workflow order

[`.github/workflows/publish-secure-auth.yml`](../.github/workflows/publish-secure-auth.yml) (`workflow_dispatch` **only** — no push/tag/release triggers):

1. Pre-flight changelog (`prepare-release.mjs`) — new release vs recovery.
2. `npm run audit:security` + `npm run validate`.
3. Build exact publication tarball (`npm pack`).
4. Reject npm version collisions and inconsistent pre-existing tags.
5. Commit release metadata to `main` (`github-actions[bot]`) when version changed.
6. `npm publish` with provenance (OIDC / Trusted Publishing).
7. Create and push `secure-auth-vX.Y.Z` tag (`git config` set on runner).
8. Create GitHub Release if missing.

## Recovery mode

Use when a release partially succeeded (e.g. npm published but tag missing):

1. Move shipped notes out of `Unreleased` manually if needed so `Unreleased` is **empty**.
2. Ensure manifests already show target `X.Y.Z`.
3. Re-run **Publish package to npmjs** on `main`.

The workflow skips duplicate npm publish and completes missing tag/release steps.

## One-time setup

OIDC Trusted Publisher, environment `npmjs`, and branch protection that allows the release bot to push metadata are documented in:

- [publishing-npm-automation.md](./publishing-npm-automation.md) — Trusted Publisher and npm settings
- [repo-settings.md](./repo-settings.md) — GitHub protection and environment rules

## Package manifest requirements

`packages/secure-auth/package.json` must include:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/tgoliveira11/next-secure-auth-starter.git",
  "directory": "packages/secure-auth"
}
```

Required for npm provenance.

## What agents must not do

- Bump `package.json` / lockfile versions for release
- Create `secure-auth-v*` tags locally
- Run `npm publish`
- Dispatch `publish-secure-auth.yml`
- Push release metadata commits to `main`
