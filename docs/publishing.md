# Publishing `@tgoliveira/secure-auth`

**Manual only.** npm publication and GitHub Releases are never automatic. Agents must not run the publish workflow or `npm publish` without explicit owner approval.

## Release invariant

For every published version `X.Y.Z`:

```text
npm @tgoliveira/secure-auth@X.Y.Z  ⟺  git tag secure-auth-vX.Y.Z  ⟺  GitHub Release secure-auth-vX.Y.Z
```

This repository uses the **`secure-auth-v`** tag prefix (not bare `vX.Y.Z`) because the monorepo may publish other packages later.

Release metadata is merged first through a pull request. The publish workflow then completes all three publication artifacts in one run, or finishes missing pieces in **recovery mode** (re-dispatch on `main` after partial failure — no duplicate version bump).

## Who may publish

| Actor | May publish? |
| --- | --- |
| Repository owner | Yes — manual workflow dispatch |
| `github-actions[bot]` | Yes — via `publish-secure-auth.yml` only |
| AI agents / contributors | **No** — unless the owner explicitly requests it |

## Changelog and version selection

| `CHANGELOG.md` `Unreleased` | Release preparation behavior |
| --- | --- |
| Has entries | Run `scripts/prepare-release.mjs` on a release branch, then merge the generated metadata through a PR |
| Empty | The publish workflow may publish or recover the version already in `packages/secure-auth/package.json` |

`scripts/prepare-release.mjs` enforces this before any bump:

- Blank `version` input + empty `Unreleased` → recovery mode (`changed=false`, `recovery=true`).
- `patch` / `minor` / `major` / exact version + empty `Unreleased` → **fail early** with a clear error.

Automatic bump rules (when `Unreleased` is non-empty and `version` is blank):

1. `**Breaking:**` in notes → major (or minor while major is `0`).
2. `### Added` has entries → minor.
3. Otherwise → patch.

## Prepare release metadata (owner)

1. Ensure `main` is green and `Unreleased` has the release notes.
2. Create a release branch from current `main`.
3. Run the preparation script. Leave `RELEASE_SPEC` unset for automatic bumping, or set `patch`, `minor`, `major`, or exact `x.y.z`.
4. Commit only the generated manifests, lockfile, and changelog metadata as `Release x.y.z`.
5. Open a pull request, let required checks pass, and merge it to `main`.

```bash
git switch -c release/secure-auth-vx.y.z
node scripts/prepare-release.mjs
# or: RELEASE_SPEC=patch node scripts/prepare-release.mjs
```

## Publish the prepared release (owner)

After the metadata PR is merged and `Unreleased` is empty, run **Publish package to npmjs** on `main` with a blank version:

```bash
gh workflow run publish-secure-auth.yml --ref main
```

The workflow refuses a premature dispatch while release notes are still in `Unreleased`; it never pushes directly to protected `main`.

## Workflow order

[`.github/workflows/publish-secure-auth.yml`](../.github/workflows/publish-secure-auth.yml) (`workflow_dispatch` **only** — no push/tag/release triggers):

1. Confirm the merged metadata puts the workflow in recovery/readiness mode (`prepare-release.mjs` reports `changed=false`, `recovery=true`).
2. `npm run audit:security` + `npm run validate`.
3. Build exact publication tarball (`npm pack`).
4. Reject npm version collisions and inconsistent pre-existing tags.
5. `npm publish` with provenance (OIDC / Trusted Publishing).
6. Create and push `secure-auth-vX.Y.Z` tag (`git config` set on runner).
7. Create GitHub Release if missing.

## Recovery mode

Use when a release partially succeeded (e.g. npm published but tag missing):

1. If metadata is incomplete, fix it on a branch and merge it through a PR so `Unreleased` is **empty** and manifests show target `X.Y.Z`.
2. Re-run **Publish package to npmjs** on `main` with a blank version.

The workflow skips duplicate npm publish and completes missing tag/release steps.

## One-time setup

OIDC Trusted Publisher, environment `npmjs`, and protected-main settings are documented in:

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

- Bump `package.json` / lockfile versions for release without explicit owner authorization
- Create `secure-auth-v*` tags locally
- Run `npm publish`
- Dispatch `publish-secure-auth.yml`
- Push release metadata commits directly to `main`
