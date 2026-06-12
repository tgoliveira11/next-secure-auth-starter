# Starter module deduplication (Phase 10)

**Status:** Complete (2026-06-11)

Phase 10 removed duplicated auth/account/security modules from `apps/starter` now that `@tgoliveira/secure-auth` is the single implementation and the starter consumes **public package exports only**.

## Removed from starter

| Path | Replacement |
| --- | --- |
| `modules/account/` | `@tgoliveira/secure-auth` / `@tgoliveira/secure-auth/server` |
| `modules/auth/` | `@tgoliveira/secure-auth/next` (`getAuthOptions`, route handlers) |
| `modules/sessions/` | Package services + `@tgoliveira/secure-auth/client` |
| `modules/two-factor/` | Package services + client APIs |
| `modules/passkeys/` | Package services + `@tgoliveira/secure-auth/client` |
| `modules/audit/` | Package repositories |
| `modules/rate-limit/` | Package adapters |
| `modules/security/` | Package policies (`@tgoliveira/secure-auth`, client password-policy) |
| `modules/ui/` | `@tgoliveira/secure-auth/react` and `@tgoliveira/secure-auth/react/client` |
| `server/*` shims | Deleted — no remaining `@/server/` imports |

Starter tests that exercised duplicated module internals were removed or rewritten as package smoke / app wiring tests. Route handler behavior tests live in `packages/secure-auth` vitest.

## Intentionally kept in starter

| Path | Reason |
| --- | --- |
| `lib/db/index.ts` | App-owned Postgres connection |
| `lib/db/schema.ts` | Re-export of package Drizzle schema |
| `lib/secure-auth.ts` | `createSecureAuth(config)` wiring + env |
| `lib/brand.ts` | App display name defaults |
| `lib/load-env.ts` | Drizzle CLI env loading (avoids pulling server graph into config) |
| `lib/auth-trace.ts` | Edge-safe middleware trace (avoids `@tgoliveira/secure-auth/next` in middleware) |
| `lib/two-factor-cookies.ts` | App slug–aligned 2FA challenge cookie name |
| `lib/sign-out-account.ts` | Client-only sign-out wrapper (NextAuth bundling boundary) |
| `modules/email/core/` | App-owned SMTP/console delivery adapter |
| `modules/email/templates/` | App-branded account email copy |
| `app/` pages, layouts, middleware | Integration harness UI |
| `components/` | App-specific screens composing package React exports |
| `features/passkey/` | Thin client feature helpers delegating to package client APIs |
| `app/api/openapi/route.ts` | App-specific OpenAPI surface |

## How the starter consumes the package

| Concern | Import |
| --- | --- |
| Factory + routes | `@tgoliveira/secure-auth/next` via `src/lib/secure-auth.ts` |
| Browser API client, passkeys, formatters | `@tgoliveira/secure-auth/client` |
| Password policy (server pages) | `@tgoliveira/secure-auth/client/password-policy` |
| UI primitives | `@tgoliveira/secure-auth/react` |
| Client hooks / ConfirmDialog | `@tgoliveira/secure-auth/react/client` |
| Schema | `@tgoliveira/secure-auth/drizzle/schema` |
| Email types | `@tgoliveira/secure-auth/email` |
| `safeLogger` in email adapter | `@tgoliveira/secure-auth` |

No starter code imports copied auth internals from removed `src/modules/*` trees. The package imports nothing from `apps/starter`.

## Remaining duplication / follow-up

| Item | Notes |
| --- | --- |
| Email delivery | Starter keeps SMTP/console adapter until fully config-driven via `EmailProvider` only |
| `vitest` package fallback alias | Starter tests resolve missing `@/` paths into package `src/` for package-only modules — harness convenience, not runtime duplication |
| OAuth-only account deletion | `TODO_SECURITY_REVIEW_REQUIRED` in **package** `account-service` — see `docs/security-hardening.md` |
| Package publication | Not done in Phase 10 |

## Verification

```bash
npm run build -w @tgoliveira/secure-auth
npm run build
npm run test -w @tgoliveira/secure-auth
npm run test -w @secure-auth/starter
```

Grep checks (should be empty except email):

```bash
rg '@/modules/(auth|account|sessions|two-factor|passkeys|audit|rate-limit|security|ui)' apps/starter/src
rg '@/server/' apps/starter/src
```
