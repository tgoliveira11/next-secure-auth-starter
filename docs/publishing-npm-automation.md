# npm release process

Releases of `@tgoliveira/secure-auth` are initiated manually. Version metadata is prepared with the
repository script and merged through a pull request; validation, npm publication, the Git tag, and
the GitHub release are automated. Do not create release tags or publish from a workstation.

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
2. Keep `main` protected and require release metadata to arrive through a pull request. Allow GitHub
   Actions to create `secure-auth-v*` tags after npm publication.
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

## Prepare and publish a release

Use the protected-main flow below — see [publishing.md](./publishing.md) for the release invariant and recovery mode.

1. Create a release branch from current `main`.
2. Run `node scripts/prepare-release.mjs` for automatic versioning, or set `RELEASE_SPEC` to an exact
   stable version, `patch`, `minor`, or `major`.
3. Commit the generated version/changelog metadata, open a pull request, and merge it after checks.
4. Open **Actions** → **Publish package to npmjs**, select `main`, leave `version` blank, and run it.

Equivalent GitHub CLI commands:

```bash
node scripts/prepare-release.mjs
RELEASE_SPEC=patch node scripts/prepare-release.mjs
# after the metadata PR is merged:
gh workflow run publish-secure-auth.yml --ref main
```

When `RELEASE_SPEC` is unset or `auto`, `scripts/prepare-release.mjs` uses the `Unreleased` changelog:

1. A `**Breaking:**` entry selects major, or minor while the current major is `0`.
2. Otherwise, an entry under `Added` selects minor.
3. Otherwise, the release selects patch.

If `Unreleased` is empty, the workflow enters readiness/recovery mode for the current version. It can
publish a prepared version or finish missing npm, tag, or GitHub release state without publishing a
duplicate. If `Unreleased` is not empty, the workflow fails before validation/publication and tells
the operator to merge release metadata through a PR.

## Publication gates and ordering

The workflow serializes releases and then:

1. Checks out `main` with full tag history and installs the exact lockfile.
2. Audits dependencies at the high threshold, which also blocks critical vulnerabilities.
3. Confirms version/changelog metadata was already merged through a PR.
4. Runs types, lint, tests, the 95% coverage gate, and all builds.
5. Builds one package tarball and uses that exact artifact for publication.
6. Rejects npm version collisions and inconsistent pre-existing tags.
7. Publishes the tarball with OIDC/provenance.
8. Creates `secure-auth-vx.y.z` only after npm succeeds.
9. Creates GitHub release notes and a workflow summary.

The npm registry is immutable. If publication succeeds but later metadata creation fails, rerun the
workflow with a blank version; recovery mode completes the missing state.

## Post-release verification

- Confirm npm shows the expected version and provenance badge.
- Confirm every documented package entry point resolves.
- Confirm README, license, migrations, and styles are present in the npm tarball.
- Confirm the Git tag and GitHub release point to the release commit.
- Confirm `CHANGELOG.md` contains a new empty `Unreleased` section.
