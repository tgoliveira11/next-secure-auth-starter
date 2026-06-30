# npm release process

Releases of `@tgoliveira/secure-auth` are initiated manually, while version calculation, validation,
npm publication, the release commit, Git tag, and GitHub release are automated. Do not bump package
versions or create release tags manually.

## Version policy

The package follows Semantic Versioning. While the major version is `0`:

- Fixes and documentation-only changes select a patch release.
- Additive features select a minor release.
- Breaking public API changes also select a minor release.

Every consumer-visible change belongs under `CHANGELOG.md` → `Unreleased`, using `Added`, `Changed`,
`Deprecated`, `Removed`, `Fixed`, or `Security`. Mark breaking changes with `**Breaking:**` and include
a migration path.

Pull requests and pushes to `main` run `.github/workflows/validate.yml`, which executes the same
monorepo validation command and a package dry-run before release.

The first release through this workflow migrates the legacy `0.1.22-internal` version to stable
SemVer. An automatic patch becomes `0.1.23`; an explicit version must be greater than `0.1.22`.

## One-time GitHub and npm setup

1. Create a protected GitHub environment named `npmjs` and add required reviewers if desired.
2. Allow GitHub Actions to push release commits and `secure-auth-v*` tags to `main`, or provide an
   equivalently scoped GitHub App token if branch protection blocks `GITHUB_TOKEN` pushes.
3. Configure an npm GitHub Actions trusted publisher for `@tgoliveira/secure-auth`:
   - Repository owner: `tgoliveira11`
   - Repository: `next-secure-auth-starter`
   - Workflow filename: `publish-secure-auth.yml`
   - Environment: `npmjs`
   - Allowed action: `npm publish`
4. After one successful OIDC publication, remove the legacy `NPM_TOKEN` secret and disallow token
   publishing in npm settings. The workflow retains token fallback only during migration.

Trusted publishing requires a GitHub-hosted runner, Node 22.14 or newer, npm 11.5.1 or newer, and
`id-token: write`. The workflow uses Node 24 and verifies the npm version before continuing.

## Start a release

Use GitHub Actions — see [publishing.md](./publishing.md) for the release invariant and recovery mode.

1. Open **Actions** → **Publish package to npmjs**.
2. Select **Run workflow** on `main`.
3. Leave `version` blank for automatic versioning, or enter an exact stable version, `patch`,
   `minor`, or `major`.

Equivalent GitHub CLI commands:

```bash
gh workflow run publish-secure-auth.yml --ref main
gh workflow run publish-secure-auth.yml --ref main -f version=0.2.0
gh workflow run publish-secure-auth.yml --ref main -f version=patch
```

When `version` is blank or `auto`, `scripts/prepare-release.mjs` uses the `Unreleased` changelog:

1. A `**Breaking:**` entry selects major, or minor while the current major is `0`.
2. Otherwise, an entry under `Added` selects minor.
3. Otherwise, the release selects patch.

If `Unreleased` is empty, the workflow enters recovery mode for the current version. It can finish
missing npm, tag, or GitHub release state without publishing a duplicate.

## Publication gates and ordering

The workflow serializes releases and then:

1. Checks out `main` with full tag history and installs the exact lockfile.
2. Audits dependencies at the high threshold, which also blocks critical vulnerabilities.
3. Calculates the version and moves `Unreleased` into a dated release section.
4. Runs types, lint, tests, the 95% coverage gate, and all builds.
5. Builds one package tarball and uses that exact artifact for publication.
6. Rejects npm version collisions and inconsistent pre-existing tags.
7. Commits all package manifests, `package-lock.json`, and `CHANGELOG.md` as `Release x.y.z`.
8. Publishes the tarball with OIDC/provenance.
9. Creates `secure-auth-vx.y.z` only after npm succeeds.
10. Creates GitHub release notes and a workflow summary.

The npm registry is immutable. If publication succeeds but later metadata creation fails, rerun the
workflow with a blank version; recovery mode completes the missing state.

## Post-release verification

- Confirm npm shows the expected version and provenance badge.
- Confirm every documented package entry point resolves.
- Confirm README, license, migrations, and styles are present in the npm tarball.
- Confirm the Git tag and GitHub release point to the release commit.
- Confirm `CHANGELOG.md` contains a new empty `Unreleased` section.
