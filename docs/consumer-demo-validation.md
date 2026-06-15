# Consumer demo validation report

**App:** `apps/consumer-demo` (`@secure-auth/consumer-demo`)  
**Package:** `@tgoliveira/secure-auth@0.1.6-internal`  
**Date:** 2026-06-12

## Summary

The consumer demo validates that a **new Next.js application** can integrate `@tgoliveira/secure-auth` using **public exports only**, without `apps/starter`, package `src/`, runtime helpers, or copied auth UI.

## App created

| Item | Status |
| --- | --- |
| `apps/consumer-demo/package.json` | Created |
| Own DB connection (`src/lib/db.ts`) | Created |
| Console `EmailProvider` (`src/lib/email-provider.ts`) | Created |
| `createSecureAuth(config)` (`src/lib/secure-auth.ts`) | Created |
| `SecureAuthUIProvider` in root layout | Created |
| Package styles import | Created |
| 13 page wrappers | Created |
| 35 API route wrappers | Created |
| Import boundary test | Created |

## Public exports used

| Export | Usage |
| --- | --- |
| `@tgoliveira/secure-auth/next` | `createSecureAuth` |
| `@tgoliveira/secure-auth/react` | Pages, `SecureAuthUIProvider`, home UI primitives |
| `@tgoliveira/secure-auth/email` | `EmailProvider` type |
| `@tgoliveira/secure-auth/drizzle/schema` | `authSchema` for Drizzle client |
| `@tgoliveira/secure-auth/styles.css` | Global styles |

## Forbidden imports — confirmed absent

Automated scan (`src/test/import-boundaries.test.ts`) over `src/app`, `src/lib`, `src/components`:

- No `apps/starter` imports
- No `packages/secure-auth/src` imports
- No `@tgoliveira/secure-auth/server`
- No `createRoutes`, `createAuthServices`, runtime helpers

**Note:** `drizzle.config.ts` references `../../packages/secure-auth/src/drizzle/schema.ts` for drizzle-kit tooling only (not runtime app code). Migrations output uses package-owned `packages/secure-auth/migrations`.

## Routes wired

All handlers exposed on `secureAuth.routes.*` are wired:

- Auth: register, login flows, 2FA, passkeys, password reset, verify email, password policy, package health, NextAuth
- Account: profile, auth status, change password, sessions, 2FA, passkeys

No missing handlers — no invented business logic in route files.

## Pages wired

| Path | Package page |
| --- | --- |
| `/login` | `LoginPage` (with intentional prop override) |
| `/register` | `RegisterPage` |
| `/forgot-password` | `ForgotPasswordPage` |
| `/reset-password` | `ResetPasswordPage` |
| `/verify-email` | `VerifyEmailPage` |
| `/check-email` | `CheckEmailPage` |
| `/login/2fa` | `LoginTwoFactorPage` |
| `/login/complete` | `LoginCompletePage` |
| `/account-deleted` | `AccountDeletedPage` |
| `/settings/account` | `AccountSettingsPage` |
| `/settings/security` | `SecuritySettingsPage` |
| `/settings/sessions` | `SessionsSettingsPage` |
| `/dashboard` | `DashboardPlaceholderPage` |

## UI config via SecureAuthUIProvider

`secureAuth.uiConfig` is passed to `SecureAuthUIProvider` in `src/app/layout.tsx`.

Configured messages include:

- `loginTitle`: "Sign in to Consumer Demo"
- `registerTitle`: "Create your Consumer Demo account"
- `securitySettingsTitle`: "Consumer Demo security"
- `sessionsSettingsTitle`: "Active Consumer Demo sessions"

## Prop override test

`/login` passes `title="Prop override: custom sign-in title"` to `LoginPage`, overriding provider config. This proves **prop → provider → default** precedence.

## Database setup

- Consumer-owned connection in `src/lib/db.ts`
- Schema from `@tgoliveira/secure-auth/drizzle/schema`
- Migrations from `packages/secure-auth/migrations`
- Default dev URL: `postgresql://postgres:postgres@localhost:5433/consumer_demo_auth` (matches monorepo Docker Compose)

Create the database before first migrate:

```bash
docker compose up -d
psql "$DATABASE_URL" -c "SELECT 1"  # or create DB: consumer_demo_auth
npm run db:migrate:consumer
```

## EmailProvider setup

Console provider logs `to`, `subject`, `text`, and `html` — no SMTP, no starter email modules.

## Validation command results

| Command | Result |
| --- | --- |
| `npm install` | Pass |
| `npm run build -w @tgoliveira/secure-auth` | Pass |
| `npm run build -w @secure-auth/consumer-demo` | Pass |
| `npm run typecheck -w @secure-auth/consumer-demo` | Pass |
| `npm run lint -w @secure-auth/consumer-demo` | Pass |
| `npm run test -w @secure-auth/consumer-demo` | Pass (1 test) |
| `npm run build` (root) | Pass |
| `npm run test` (root) | Pass |
| `npm run db:migrate -w @secure-auth/consumer-demo` | Requires PostgreSQL + `consumer_demo_auth` database |

## Issues found and fixes

| Issue | Fix |
| --- | --- |
| `workspace:*` unsupported by npm in this environment | Use `"0.1.6-internal"` with npm workspaces (resolves to local package) |
| Import boundary test flagged its own forbidden strings | Scan only `src/app`, `src/lib`, `src/components` |
| Default DB port 5432 vs monorepo Docker 5433 | Updated `.env.example` and `drizzle.config.ts` to port 5433 |

## Remaining gaps

- **E2E / manual auth flows** not exercised in CI for consumer-demo (same as starter for OAuth/passkeys).
- **`db:migrate`** requires a running PostgreSQL instance and database creation — documented above.
- **Home page** uses package `Button`/`Card` primitives only — intentionally minimal, not a copied starter layout.

## Conclusion

`apps/consumer-demo` proves `@tgoliveira/secure-auth` is consumable as a package with minimal app-owned wiring: config, DB, EmailProvider, route wrappers, page wrappers, UI provider, and styles.
