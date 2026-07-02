# Database migrations

## Strategy (Option A)

The **package owns** the authentication schema and versioned SQL migrations. The **consumer owns** the database connection and runs migrations against its database.

| Artifact | Location |
| --- | --- |
| Drizzle schema | `packages/secure-auth/src/drizzle/schema.ts` (monorepo) |
| Public export | `@tgoliveira/secure-auth/drizzle/schema` |
| SQL migrations | `packages/secure-auth/migrations/` (published in tarball) |
| Drizzle meta | `packages/secure-auth/migrations/meta/` |

## Starter app (local monorepo)

`apps/dev-harness/drizzle.config.ts`:

```typescript
schema: "../../packages/secure-auth/src/drizzle/schema.ts",
out: "../../packages/secure-auth/migrations",
```

```bash
npm run db:generate   # after schema changes
npm run db:migrate    # apply to local Postgres
```

## Downstream repos

See **[consumer-quick-start.md](./consumer-quick-start.md)** (sections 4–5) for full schema import and migration setup.

1. Install `@tgoliveira/secure-auth@0.1.9-internal` and peer dependencies.
2. Point `drizzle.config.ts` at `node_modules/@tgoliveira/secure-auth/dist/drizzle/schema.js` and `migrations/`.
3. Run `drizzle-kit migrate` in CI or release pipeline.
4. **Do not duplicate** auth table definitions — import `authSchema` when configuring Drizzle.

### Coexisting app schemas

```typescript
import { authSchema } from "@tgoliveira/secure-auth/drizzle/schema";
import * as appSchema from "./app-schema";

export const schema = { ...authSchema, ...appSchema };
```

Keep app tables in a separate schema namespace or prefixed table names to avoid collisions.

## Version compatibility

| Package version | Migration policy |
| --- | --- |
| `0.1.x` | Initial extraction; breaking DB changes allowed with minor bumps |
| `0.2.x` | Document every breaking migration in package CHANGELOG |
| `0.3.x` / `0.4.x` | Admin platform tables in `0002_v0_3_admin_platform.sql` (users profile/role columns + `login_attempt_counters`, `invite_codes`, `invite_uses`, `api_keys`, `admin_config_overrides`) |
| `0.5.x+` | Semver for API; major bump for breaking DB |

## Breaking DB changes

1. Add a new numbered migration under `packages/secure-auth/migrations/`.
2. Document in package README + [CHANGELOG.md](../CHANGELOG.md) + [security.md](./security.md).
3. Bump package minor (0.2.x) until 1.0.0 contract freeze.

## Rollback

Drizzle SQL migrations are **forward-only** in this starter. Rollback procedure:

1. Restore database snapshot, or
2. Author a compensating migration (preferred for production).

Do not delete applied migration files.

## Troubleshooting

### `POST /api/auth/forgot-password` returns 500 with `Failed query: select ... from "users"`

The package schema expects v0.3+ columns on `users` (`role`, `status`, `display_name`, etc.). This error usually means **migrations were not applied** to the consumer database.

1. Confirm the installed package version in [CHANGELOG.md](../CHANGELOG.md).
2. Run migrations against the same database your app uses:

   ```bash
   npm run db:migrate
   # or drizzle-kit migrate with migrations from @tgoliveira/secure-auth/migrations
   ```

3. Ensure migration `0002_v0_3_admin_platform.sql` (or later) has been applied.
4. Call `GET /api/auth/health` — when the schema is current, the response includes `"database": { "ready": true }`. When migrations are missing, it returns **503** with a migration hint.

Forgot-password intentionally returns a **generic 200** message when a schema error occurs (no account enumeration), but logs include `migrationHint` for operators.

---

## Package version upgrades

When upgrading `@tgoliveira/secure-auth`:

1. Read [CHANGELOG.md](../CHANGELOG.md) for breaking changes.
2. Run `npm run db:migrate` if the release includes new SQL migrations.
3. Rebuild the package (`npm run build -w @tgoliveira/secure-auth` in monorepo).
4. Verify `createSecureAuth(config)` options — removed APIs are listed in [package-api.md](./package-api.md#unsupported-entry-points).

Removed in `0.1.4-internal` (do not use):

- `@tgoliveira/secure-auth/server`
- `createRoutes`, `createAuthServices`, `createRouteHandlers`
- Global runtime helpers (`getSecureAuthConfig`, `getSecureAuthDb`)

Current integration pattern:

- `createSecureAuth(config)` — composition root
- `secureAuth.routes.*` — API handlers
- `secureAuth.uiConfig` → `SecureAuthUIProvider` — page defaults
