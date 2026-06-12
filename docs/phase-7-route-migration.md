# Phase 7 — Route migration status

**Date:** 2026-06-12  
**Package:** `@tgoliveira/secure-auth@0.1.0` (experimental)

## Summary

All **auth/account API routes** that existed in the starter are now implemented in the package and exposed via `secureAuth.routes.*`. Starter `route.ts` files are **thin wrappers** importing from `@/lib/secure-auth`.

**Intentionally not migrated** (app-specific):

| Route | Reason |
| --- | --- |
| `GET /api/openapi` | Serves repo-level `docs/openapi.yaml` — app documentation concern |

## Migrated routes

### Auth

| Starter path | `secureAuth.routes` key |
| --- | --- |
| `POST /api/auth/register` | `register.POST` |
| `POST /api/auth/login/start` | `loginStart.POST` |
| `POST /api/auth/login/start-form` | `loginStartForm.POST` |
| `POST /api/auth/login/complete` | `loginComplete.POST` |
| `POST /api/auth/login/verify-2fa` | `loginVerify2fa.POST` |
| `POST /api/auth/login/verify-2fa-form` | `loginVerify2faForm.POST` |
| `POST /api/auth/login/verify-2fa-oauth` | `loginVerify2faOauth.POST` |
| `GET /api/auth/login/challenge-status` | `loginChallengeStatus.GET` |
| `GET /api/auth/login/trace` | `loginTrace.GET` |
| `POST /api/auth/forgot-password` | `forgotPassword.POST` |
| `POST /api/auth/reset-password` | `resetPassword.POST` |
| `GET /api/auth/password-policy` | `passwordPolicy.GET` |
| `POST /api/auth/verify-email/confirm` | `verifyEmailConfirm.POST` |
| `POST /api/auth/verify-email/resend` | `verifyEmailResend.POST` |
| `POST /api/auth/passkey/login/options` | `passkeyLoginOptions.POST` |
| `POST /api/auth/passkey/login/verify` | `passkeyLoginVerify.POST` |
| `GET/POST /api/auth/[...nextauth]` | `nextAuth.GET` / `nextAuth.POST` |
| `GET /api/auth/package-health` | `health.GET` |

### Account

| Starter path | `secureAuth.routes` key |
| --- | --- |
| `GET/DELETE /api/account` | `account.GET` / `account.DELETE` |
| `GET /api/account/auth-status` | `accountAuthStatus.GET` |
| `POST /api/account/change-password` | `changePassword.POST` |
| `GET /api/account/passkeys` | `passkeysList.GET` |
| `POST /api/account/passkeys/register` | `passkeyRegister.POST` |
| `DELETE /api/account/passkeys/[id]` | `passkeyById.DELETE` |
| `GET /api/account/2fa/status` | `twoFactorStatus.GET` |
| `POST /api/account/2fa/setup/start` | `twoFactorSetupStart.POST` |
| `POST /api/account/2fa/setup/verify` | `twoFactorSetupVerify.POST` |
| `POST /api/account/2fa/disable` | `twoFactorDisable.POST` |
| `POST /api/account/2fa/backup-codes/regenerate` | `twoFactorBackupCodesRegenerate.POST` |
| `GET /api/account/sessions` | `sessionsList.GET` |
| `DELETE /api/account/sessions/[id]` | `sessionById.DELETE` |
| `POST /api/account/sessions/ping` | `sessionsPing.POST` |
| `POST /api/account/sessions/revoke-current` | `sessionsRevokeCurrent.POST` |
| `POST /api/account/sessions/revoke-others` | `sessionsRevokeOthers.POST` |
| `POST /api/account/sessions/revoke-all` | `sessionsRevokeAll.POST` |

### Legacy aliases (same handlers)

| Key | Maps to |
| --- | --- |
| `verifyEmail.POST` | `verifyEmailConfirm` |
| `passwordResetStart.POST` | `forgotPassword` |
| `passwordResetComplete.POST` | `resetPassword` |
| `twoFactorSetup.POST` | `twoFactorSetupStart` |
| `twoFactorVerify.POST` | `twoFactorSetupVerify` |
| `passkeyAuthenticate.POST` | `passkeyLoginVerify` |
| `sessions.GET` | `sessionsList` |

## Starter wrappers

Example (`apps/starter/src/app/api/auth/register/route.ts`):

```typescript
import { secureAuth } from "@/lib/secure-auth";

export const POST = secureAuth.routes.register.POST;
```

## Config changes

`createSecureAuth` now accepts:

- `accountPolicy` — email verification policy (no `process.env` in package handlers)
- `oauth` — Google / Apple / Microsoft credentials (secrets stay in app env, passed via config)

## Test architecture (post–Phase 7 alignment)

### Why starter route tests failed after extraction

Starter API tests imported package handlers via `apps/starter/src/test/helpers/package-handlers.ts` but mocked `@/server/services/*` and `@/lib/*` on the **starter** vitest `@/` alias. Package handlers resolve `@/` to `packages/secure-auth/src`, so mocks never intercepted the real module graph → handlers hit live services/DB and assertions failed.

### Package-owned tests (behavior coverage)

Location: `packages/secure-auth/src/server/routes/handlers/__tests__/` (+ `src/modules/auth/lib/__tests__/` for form handlers).

Helpers: `packages/secure-auth/src/test/helpers/` (`handlers.ts`, `create-test-secure-auth.ts`, `mock-db.ts`, `mock-email-provider.ts`, `fixtures.ts`, `request.ts`, `module-source.ts`).

| Test file | Coverage |
| --- | --- |
| `register-route.test.ts` | Registration, policy, verification email policy via config |
| `register-route-errors.test.ts` | DB errors, rate limiting, URL password guard |
| `account-auth-routes.test.ts` | Forgot/reset password, verify email, change password, auth status |
| `account-route.test.ts` | Account deletion requirements + delete |
| `account-sessions-routes.test.ts` | List/revoke/ping sessions |
| `account-passkeys-routes.test.ts` | Passkey list/register/delete |
| `auth-login-routes.test.ts` | OAuth 2FA verify, backup code regeneration |
| `login-form-routes.test.ts` | Credentials form login + 2FA form redirects |
| `passkey-login-routes.test.ts` | Passkey login options/verify |
| `two-factor-routes.test.ts` | 2FA setup/verify/disable, login 2FA, challenge status |
| `route-error-branches.test.ts` | Unexpected service failure mapping |
| `password-policy-route.test.ts` | Public password policy GET |
| `auth-password-api.test.ts` | Password not in URL, no hash in responses |
| `credentials-login-form-handlers.test.ts` | Form handler redirects and cookie behavior |

Mocks target package paths (`@/server/services/*`, `@/modules/*`) inside the package vitest project.

### Starter-owned tests (wiring only)

| Test file | Coverage |
| --- | --- |
| `apps/starter/src/test/api/route-wrappers.test.ts` | Every API `route.ts` (except OpenAPI) imports `secureAuth` and delegates to `secureAuth.routes.*` |
| `apps/starter/src/test/api/openapi-route.test.ts` | App-specific OpenAPI route |
| `apps/starter/src/test/security/password-storage.test.ts` | Schema + static checks (handler hash path via package source) |

Service, UI, middleware, and boundary tests remain in starter (they exercise duplicated modules until Phase 10 dedup).

### Coverage gaps (documented)

- NextAuth OAuth provider wiring: covered by starter unit tests + manual integration; no full OAuth flow in package route tests
- Audit event assertions: covered indirectly via service tests in starter; dedicated package audit route tests deferred (no audit HTTP routes today)
- Live PostgreSQL integration: service tests in starter when DB available; package route tests use mocks

## Validation (2026-06-12)

| Command | Result |
| --- | --- |
| `npm install` | Pass |
| `npm run build -w @tgoliveira/secure-auth` | Pass |
| `npm run build` | Pass |
| `npm run test -w @tgoliveira/secure-auth` | Pass (103 tests) |
| `npm run test -w @secure-auth/starter` | Pass (502 tests) |
| `npm run lint` | Pass (7 warnings) |
| `npm run typecheck` | Pass (package + starter) |
| `npm run db:migrate` | Pass |
| `npm audit` | 11 vulnerabilities (unchanged) |

## Next phase: starter module deduplication

See [docs/starter-module-dedup-candidates.md](./starter-module-dedup-candidates.md).
