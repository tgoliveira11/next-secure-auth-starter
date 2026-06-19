# Publishing `@tgoliveira/secure-auth`

**Status:** Published publicly on [npm](https://www.npmjs.com/package/@tgoliveira/secure-auth). Releases are initiated manually through GitHub Actions and completed automatically with npm Trusted Publishing (OIDC).

## Package identity

| Field | Value |
| --- | --- |
| Name | `@tgoliveira/secure-auth` |
| Registry | `https://registry.npmjs.org` |
| Current version | See `packages/secure-auth/package.json` |
| npm dist-tag | `latest` |

## Automated publishing (recommended)

Run the **Publish package to npmjs** workflow on `main`. Do not bump versions or create tags manually.

Full instructions: **[publishing-npm-automation.md](./publishing-npm-automation.md)**

- Workflow: `.github/workflows/publish-secure-auth.yml`
- A protected `npmjs` GitHub environment and npm **Trusted Publisher** must be configured
- GitHub repo: `tgoliveira11/next-secure-auth-starter`

## Install (consumer)

```bash
npm install @tgoliveira/secure-auth@latest \
  next@^16 react@^19 react-dom@^19 next-auth@^4.24.11 drizzle-orm@^0.44.2 postgres
```

See [consumer-quick-start.md](./consumer-quick-start.md) for the full onboarding flow.

```json
{
  "dependencies": {
    "@tgoliveira/secure-auth": "^0.1.22",
    "next": "^16.0.0",
    "next-auth": "^4.24.11",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "drizzle-orm": "^0.44.2",
    "postgres": "^3.4.0"
  }
}
```

**Required peer dependencies:** `next`, `next-auth`, `react`, `react-dom`, `drizzle-orm`.

The workflow owns validation, version metadata, publication provenance, release tags, and GitHub
releases. If it is interrupted, rerun it with a blank version to enter recovery mode.

## Versioning rules

| Version | Meaning |
| --- | --- |
| `0.1.x` | Experimental |
| `0.2.x` | DB/migrations may break |
| `0.5.x` | API reasonably stable |
| `1.0.0` | Production-ready contract |

Bump patch for fixes, minor for additive API, major (post-1.0) for breaking changes.

Release tags use normal semver, such as `secure-auth-v0.1.23` (no `-internal` suffix), and are created
by the workflow only after npm publication succeeds.

## Legacy: GitHub Packages and `internal` dist-tag

Early releases used GitHub Packages (`npm.pkg.github.com`) and/or the npm `internal` dist-tag with `-internal` version suffixes. **Current consumers should use the public npm registry and `@latest`.** The `internal` dist-tag on npm may still point to an older release; do not use it for new integrations.

If you still need GitHub Packages for a private fork, configure `.npmrc` with `GITHUB_PACKAGES_TOKEN` locally — that path is not used by this repository's publish workflow.
