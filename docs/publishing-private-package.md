# Publishing private package (GitHub Packages)

**Status:** Prepared, not published publicly. Current maturity: `0.1.x` experimental.

## Package identity

| Field | Value |
| --- | --- |
| Name | `@tgoliveira/secure-auth` |
| Registry | `https://npm.pkg.github.com` |
| Version | `0.1.3-internal` |

## Registry setup (consumer)

`.npmrc` (use environment variables only — never commit tokens):

```ini
@tgoliveira:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

## GitHub token scopes

| Scope | Purpose |
| --- | --- |
| `read:packages` | Install in consumer repos / CI |
| `write:packages` | Publish from maintainer CI or local release |
| `repo` | Required when the package repo is private |

## Install (consumer repo)

See [consumer-quick-start.md](./consumer-quick-start.md) for the full onboarding flow.

```bash
export GITHUB_PACKAGES_TOKEN=ghp_...
npm install @tgoliveira/secure-auth@0.1.3-internal \
  next@^16 react@^19 react-dom@^19 next-auth@^4.24.11 drizzle-orm@^0.44.2 postgres
```

```json
{
  "dependencies": {
    "@tgoliveira/secure-auth": "0.1.3-internal",
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

## Publish (maintainer)

```bash
npm run build -w @tgoliveira/secure-auth
npm publish -w @tgoliveira/secure-auth
```

`publishConfig.registry` is set in `packages/secure-auth/package.json`.

## Versioning rules

| Version | Meaning |
| --- | --- |
| `0.1.x` | Experimental internal |
| `0.2.x` | DB/migrations may break |
| `0.5.x` | API reasonably stable |
| `1.0.0` | Production-ready contract |

Bump patch for fixes, minor for additive API, major (post-1.0) for breaking changes.

## CI recommendation

1. `npm ci`
2. `npm run build -w @tgoliveira/secure-auth`
3. `npm run test`
4. Publish on tagged release only after security hardening checklist passes.
