# Security hardening tracker

**Maturity:** `0.1.x` — experimental. **Not production-ready.**

**Consumer onboarding:** [consumer-quick-start.md](./consumer-quick-start.md) · [package-api.md](./package-api.md)

Last validation: 2026-06-11 (hardening phase)

## Validation results

| Command | Result | Notes |
| --- | --- | --- |
| `npm install` | Pass | npm workspaces |
| `npm run build -w @tgoliveira/secure-auth` | Pass | No nodemailer in package bundle |
| `npm run build` | Pass | Starter + package |
| `npm run typecheck` | Pass | Package + starter |
| `npm run lint` | Pass | 6 pre-existing React hooks warnings in starter UI |
| `npm run test -w @tgoliveira/secure-auth` | Pass | 123 tests (+ 1 skipped integration) |
| `npm run test -w @secure-auth/starter` | Pass | 230 tests |
| `npm run test` | Pass | All workspaces |
| `npm run db:migrate` | Pass | Requires `docker compose up -d` |
| `npm audit` | 11 vulnerabilities | 9 moderate, 1 high, 1 critical — transitive via `next-auth` / `next` / `nodemailer` (starter only) |

## Issue tracker

| Item | Status | Risk | Notes |
| --- | --- | --- | --- |
| OAuth-only account deletion | **Done** | — | Session-bound re-auth policy; see below |
| Duplicate module code (starter + package) | **Done** | — | Phase 10 deduplication |
| Email provider abstraction | **Done** | — | Package uses `EmailProvider` only; SMTP in starter |
| Runtime dependency binding | **Done (single runtime)** | Low | `initSecureAuthRuntime(config)` binds `{ config, db }` once |
| Repository constructor DI | **Deferred 0.2.x** | Low | Scoped runtime acceptable for single-app Next.js; see [architecture.md](./architecture.md) |
| `next-auth` peer dependency | **Done** | — | Declared in package `peerDependencies` + `devDependencies` |
| Public API surface | **Done** | — | `createAuthServices` / `createRoutes` removed from exports; `/server` path removed |
| Sourcemap `sourcesContent` | **Done** | Low | tsup builds omit embedded source in `.map` files |
| npm audit findings | **Open** | Medium | Do not `audit fix --force` (breaks Next.js) |
| OAuth integration E2E | **Partial** | Medium | Policy unit tests; manual provider validation documented |
| Live PostgreSQL integration | **Opt-in** | Low | `INTEGRATION_DATABASE_URL` test; CI skips by default |

---

## A. OAuth-only account deletion (resolved)

### Previous risk

OAuth-only accounts had no password re-authentication step. A stolen session cookie could delete an account with only a confirmation phrase.

### Threat model

| Actor | Capability | Goal |
| --- | --- | --- |
| Session thief | Valid session cookie | Delete victim account |
| CSRF on DELETE | Forged request with cookies | Delete account |
| Insider / support | DB access | Out of scope (infra) |

### Mitigation (implemented)

`accountService.deleteAccount` enforces layered checks:

1. **Authenticated session** — route uses `requireFullyAuthenticatedUser()` (2FA-complete when enabled).
2. **Confirmation phrase** — exact match `DELETE MY ACCOUNT`.
3. **Password accounts** — bcrypt password re-verification.
4. **Passwordless accounts** (OAuth-only or passkey-only):
   - Valid `accountSessionId` on the session.
   - Account session row active (not revoked, not expired).
   - Session activity within **15 minutes** (`ACCOUNT_DELETION_REAUTH_WINDOW_MS`).
   - Session `authMethod` matches account primary factor:
     - OAuth: `google` / `apple` / `microsoft` aligned with `user.authProvider`.
     - Passkey-only credentials: session `authMethod` must be `passkey`.
5. **Rate limit** — `account.delete` (3/hour per user).
6. **Audit** — `account_deletion_requested` with `authProvider`, `method`, `endpoint`.

Implementation: `packages/secure-auth/src/modules/account/lib/account-deletion-policy.ts`

### Test coverage

| Scenario | Test file |
| --- | --- |
| Policy: OAuth fresh session | `account-deletion-policy.test.ts` |
| Policy: stale / revoked / mismatch | `account-deletion-policy.test.ts` |
| Policy: passkey-only credentials | `account-deletion-policy.test.ts` |
| Service: password / OAuth / errors | `account-service-deletion.test.ts` |
| Route: DELETE wiring | `account-route.test.ts` |
| Audit metadata persisted | `audit-repository.test.ts` |

`TODO_SECURITY_REVIEW_REQUIRED` removed from codebase.

### Residual risk

Provider-native re-auth prompts (Google/Apple/Microsoft “sign in again”) are **not** implemented. Mitigation relies on recent account-session proof. For higher assurance, add OAuth `prompt=login` step-up in a future minor release.

---

## B. Security review pass (focused)

| Area | Status | Findings |
| --- | --- | --- |
| **Login** | OK | Rate limits on login/2FA; opaque login tokens hashed; generic failure messages |
| **Registration** | OK | Password hashed bcrypt; email verification optional; no password in responses |
| **Password reset** | OK | Opaque tokens hashed; TTL enforced; generic forgot-password message |
| **Email verification** | OK | Tokens hashed; rate limited resend |
| **Sessions** | OK | Server-side account sessions; revoke others/all; ownership checks on revoke |
| **Passkeys** | OK | WebAuthn challenge/verify; credential scoped to user |
| **2FA / backup codes** | OK | TOTP secrets encrypted at rest; backup codes hashed; rate limits |
| **Account deletion** | OK | See section A |
| **Token hashing** | OK | Login, reset, verification tokens stored hashed |
| **Replay protection** | OK | One-time tokens revoked after use; session revocation |
| **Audit events** | OK | Sanitized metadata allowlist; sensitive keys stripped |
| **Rate limiting** | OK | Per-operation limits; in-memory default, Postgres adapter available |
| **Error messages** | OK | No password/hash leakage in API responses (see `auth-password-api.test.ts`) |

---

## Integration coverage

| Gap | Status | Manual validation |
| --- | --- | --- |
| OAuth Google/Apple/Microsoft callbacks | Unit: `oauth-sign-in-policy.test.ts` | Configure `.env.local` OAuth secrets; sign in per provider |
| Audit persistence | Unit: `audit-repository.test.ts` | Delete test account; inspect `audit_events` table |
| Live PostgreSQL | Opt-in: `postgres.integration.test.ts` | `INTEGRATION_DATABASE_URL=$DATABASE_URL npm run test -w @tgoliveira/secure-auth -- src/test/integration` |

---

## Secret rotation checklist

If `.env.local` or credentials were ever exposed:

- [ ] `NEXTAUTH_SECRET`
- [ ] `TWO_FACTOR_SECRET_ENCRYPTION_KEY`
- [ ] OAuth client secrets (Google, Apple, Microsoft)
- [ ] `DATABASE_URL` password
- [ ] SMTP credentials (starter `EMAIL_PROVIDER=smtp`)
- [ ] `GITHUB_PACKAGES_TOKEN`

## Production readiness gate (1.0.0)

- [x] OAuth-only account deletion reviewed and implemented
- [x] Email delivery abstracted behind `EmailProvider`
- [x] Single explicit runtime binding (`createSecureAuth`)
- [x] Scoped runtime documented as temporary 0.1.x limitation
- [x] `next-auth` peer dependency declared
- [x] Internal wiring (`createAuthServices`, `createRoutes`) not public API
- [ ] Repository constructor injection (0.2.x)
- [ ] npm audit clean or accepted with documented exceptions
- [ ] Security review sign-off documented
