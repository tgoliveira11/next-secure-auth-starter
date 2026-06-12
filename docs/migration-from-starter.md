# Migration from standalone starter

## What changed

| Before (standalone) | After (monorepo) |
| --- | --- |
| `src/` at repo root | `apps/starter/src/` |
| `drizzle/` at repo root | `packages/secure-auth/migrations/` |
| `src/lib/db/schema.ts` (local) | Re-export from `@tgoliveira/secure-auth/drizzle/schema` |
| Route handlers inline | Thin wrappers → `secureAuth.routes.*` (incremental) |
| Single `package.json` | npm workspaces root + `@secure-auth/starter` + `@tgoliveira/secure-auth` |

## What moved into the package (Phase 7)

- Auth Drizzle schema
- `modules/*` domain logic (auth, account, sessions, 2FA, passkeys, audit, rate-limit, email, security, ui)
- **All auth/account API route handlers** under `packages/secure-auth/src/server/routes/handlers/`
- `createSecureAuth` factory + `secureAuth.routes.*`
- `getAuthOptions()` for NextAuth (OAuth via `config.oauth`)
- Default UI primitives (`@tgoliveira/secure-auth/react`)
- SQL migrations

See [phase-7-route-migration.md](./phase-7-route-migration.md) for the full route map.

After the package-hardening phase, all routes are implemented via `createSecureAuth(config).routes.*` — legacy `createRouteHandlers` and 501 stubs were removed. See [PACKAGE_HARDENING_REPORT.md](./PACKAGE_HARDENING_REPORT.md).

## What stayed in the app (Phase 10)

- `src/lib/db/index.ts` — Postgres connection
- `src/lib/secure-auth.ts` — env → `createSecureAuth` wiring
- `src/modules/email/` — SMTP/console delivery adapter + app-branded templates
- App-local helpers: `lib/auth-trace.ts`, `lib/two-factor-cookies.ts`, `lib/sign-out-account.ts`, `lib/load-env.ts`
- NextAuth `[...nextauth]` route + OAuth secrets
- App pages, layouts, middleware, `components/`
- Thin API route wrappers + wrapper wiring tests
- E2E / integration tests
- `docker-compose.yml` (repo root)

See [starter-module-dedup-candidates.md](./starter-module-dedup-candidates.md) for the full removed vs kept list.

## Test strategy

| Layer | Project | What it tests |
| --- | --- | --- |
| Route handlers | `@tgoliveira/secure-auth` vitest | Auth/account HTTP behavior with package-native mocks |
| App wiring | `@secure-auth/starter` vitest | `secureAuth.routes` delegation, OpenAPI, pages, email adapter, UI smoke tests |
| Why | — | Handler internals and domain services are package-owned after Phase 10 |

See [phase-7-route-migration.md](./phase-7-route-migration.md#test-architecture-postphase-7-alignment).

## What was removed / deprecated

- Duplicate auth schema in the starter (replaced by package import)
- Root-level app `src/` (moved to `apps/starter`)
- Duplicated `modules/{account,auth,sessions,two-factor,passkeys,audit,rate-limit,security,ui}` (Phase 10)
- `apps/starter/src/server/*` re-export shims (Phase 10)

## Consumer migration checklist

For a **brand-new app**, use [consumer-quick-start.md](./consumer-quick-start.md) and [consumer-validation-checklist.md](./consumer-validation-checklist.md).

1. Install `@tgoliveira/secure-auth@0.1.1-internal` and peer dependencies (`next-auth`, etc.).
2. Replace local schema with `@tgoliveira/secure-auth/drizzle/schema`.
3. Add `src/lib/secure-auth.ts` with `createSecureAuth(config)` — **do not** use `@tgoliveira/secure-auth/server`.
4. Point `drizzle.config.ts` at package schema + migrations.
5. Convert API routes to `secureAuth.routes.*` wrappers.
6. Run migrations; import `@tgoliveira/secure-auth/styles.css` in global CSS.
7. Remove duplicated auth module code from the app.

## Fork / template users

If you forked the pre-monorepo starter, compare against `apps/starter` and adopt package imports incrementally. See [package-api.md](./package-api.md) and [consumer-quick-start.md](./consumer-quick-start.md).
