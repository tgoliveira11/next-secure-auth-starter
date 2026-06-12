# Database migrations

## Strategy (Option A)

The **package owns** the authentication schema and versioned SQL migrations. The **consumer owns** the database connection and runs migrations against its database.

| Artifact | Location |
| --- | --- |
| Drizzle schema | `packages/secure-auth/src/drizzle/schema.ts` |
| Public export | `@tgoliveira/secure-auth/drizzle/schema` |
| SQL migrations | `packages/secure-auth/migrations/` |
| Drizzle meta | `packages/secure-auth/migrations/meta/` |

## Starter app (local)

`apps/starter/drizzle.config.ts`:

```typescript
schema: "../../packages/secure-auth/src/drizzle/schema.ts",
out: "../../packages/secure-auth/migrations",
```

```bash
npm run db:generate   # after schema changes
npm run db:migrate    # apply to local Postgres
```

## Downstream repos

1. Install `@tgoliveira/secure-auth` from GitHub Packages.
2. Point `drizzle.config.ts` at the package schema (source path in monorepo, or `node_modules/@tgoliveira/secure-auth` + published `migrations/` folder).
3. Run `drizzle-kit migrate` in CI/CD or release pipeline.
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
| `0.5.x+` | Semver for API; major bump for breaking DB |

## Breaking DB changes

1. Add a new numbered migration under `packages/secure-auth/migrations/`.
2. Document in package README + `docs/security-hardening.md`.
3. Bump package minor (0.2.x) until 1.0.0 contract freeze.

## Rollback

Drizzle SQL migrations are **forward-only** in this starter. Rollback procedure:

1. Restore database snapshot, or
2. Author a compensating migration (preferred for production).

Do not delete applied migration files.
