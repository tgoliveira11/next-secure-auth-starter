# Publishing `@tgoliveira/secure-auth`

**Status:** Published publicly on [npm](https://www.npmjs.com/package/@tgoliveira/secure-auth). Automated releases use GitHub Actions + npm Trusted Publishing (OIDC).

## Package identity

| Field | Value |
| --- | --- |
| Name | `@tgoliveira/secure-auth` |
| Registry | `https://registry.npmjs.org` |
| Current version | See `packages/secure-auth/package.json` |
| npm dist-tag | `internal` |

## Automated publishing (recommended)

Push a tag matching `secure-auth-v0.1.*-internal` after bumping the package version on `main`.

Full instructions: **[publishing-npm-automation.md](./publishing-npm-automation.md)**

- Workflow: `.github/workflows/publish-secure-auth.yml`
- **Trusted Publisher** must be configured on npm (no `NPM_TOKEN` secret)
- GitHub repo: `tgoliveira11/next-secure-auth-starter`

## Install (consumer)

```bash
npm install @tgoliveira/secure-auth@internal \
  next@^16 react@^19 react-dom@^19 next-auth@^4.24.11 drizzle-orm@^0.44.2 postgres
```

See [consumer-quick-start.md](./consumer-quick-start.md) for the full onboarding flow.

```json
{
  "dependencies": {
    "@tgoliveira/secure-auth": "0.1.7-internal",
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

## Manual publish (emergency only)

Prefer the automated workflow. If you must publish locally, use an npm account with publish access and **do not** commit tokens:

```bash
npm run build -w @tgoliveira/secure-auth
npm publish -w @tgoliveira/secure-auth --access public --tag internal
```

## Versioning rules

| Version | Meaning |
| --- | --- |
| `0.1.x` | Experimental internal |
| `0.2.x` | DB/migrations may break |
| `0.5.x` | API reasonably stable |
| `1.0.0` | Production-ready contract |

Bump patch for fixes, minor for additive API, major (post-1.0) for breaking changes.

## Legacy: GitHub Packages

Early internal releases used GitHub Packages (`npm.pkg.github.com`). **Current consumers should use the public npm registry.** If you still need GitHub Packages for a private fork, configure `.npmrc` with `GITHUB_PACKAGES_TOKEN` locally — that path is not used by this repository's publish workflow.
