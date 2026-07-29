# Security

**Maturity:** the current `@tgoliveira/secure-auth` release is experimental — **not
production-ready**. See the version in
[`packages/secure-auth/package.json`](../packages/secure-auth/package.json).

**Consumer onboarding:** [configuration-reference.md](./configuration-reference.md) · [consumer-quick-start.md](./consumer-quick-start.md) · [package-api.md](./package-api.md)

---

## Core principles

`@tgoliveira/secure-auth` is designed around secure defaults for **account authentication only**.

The system must protect:

- account credentials
- session tokens
- OAuth secrets
- TOTP secrets
- password reset and email verification tokens
- audit metadata
- rate-limit identifiers
- user privacy

Authentication is **account access only**. This package does not implement vault key derivation,
vault unlock, encrypted product storage, broker PUK custody, or product-specific cryptography. Its
optional portable-vault module is an authorization boundary only: it verifies a new WebAuthn proof,
signs a scoped broker grant, and verifies the broker's completion receipt.

Passkeys and TOTP are never encryption-key derivation inputs. Account login and portable vault
authorization remain separate ceremonies and security domains.

---

## Do not store secrets in plaintext

Never store or log these values in plaintext:

- passwords
- session tokens
- password reset tokens
- email verification tokens
- TOTP codes and backup codes
- OAuth client secrets and tokens
- SMTP credentials
- passkey challenge secrets
- raw account session tokens

---

## Passwords

Passwords must be hashed with a strong password hashing function (bcrypt with appropriate cost parameters).

Password strength is assessed via configurable policy (`passwordPolicy` in `createSecureAuth(config)`).

Recommended enforcement modes:

```text
PASSWORD_POLICY_ENFORCEMENT=off | warn | enforce
```

Default recommendation: `warn`.

### Compromised password detection

During registration and password change, the package can check passwords against the [Have I Been Pwned](https://haveibeenpwned.com/) k-anonymity API (`passwordPolicy.checkBreachedPasswords`, default `true`).

Only the first five characters of the SHA-1 hash of the password are sent to HIBP; the full password never leaves your server. If the HIBP request fails or times out (3 seconds), registration or password change proceeds without blocking (fail-open by design). Set `checkBreachedPasswords: false` for air-gapped or offline environments.

---

## Security notifications

The package sends security notification emails for high-risk account events:

- new sign-in from an unrecognized device
- password changed
- two-factor authentication disabled
- email address changed (when supported by the consumer app)
- magic link sign-in completed

These are security notifications, not marketing — end users cannot disable them from account settings. Consumers may opt out entirely with `auth.securityNotifications.enabled: false` (for example in local development).

New-device detection compares the current session `userAgentHash` against the five most recent active sessions; matching hashes skip the notification.

---

## Email verification policy

Email verification is optional by default unless configured:

```typescript
createSecureAuth({
  auth: { requireEmailVerificationBeforeSignIn: false },
  accountPolicy: {
    sendVerificationOnRegister: true,
    requireEmailVerificationBeforeSignIn: false,
  },
});
```

When `requireEmailVerificationBeforeSignIn` is `true`, email/password and passkey sign-in for credentials accounts require a verified email first.

---

## Tokens

Verification, reset, and login tokens must be:

- cryptographically random
- stored hashed (never plaintext)
- single-use
- time-limited
- consumed atomically
- never logged in production

API responses must not leak whether an email address is registered (no account enumeration).

Password reset tokens must not be validated via a separate oracle endpoint; consumers submit the token only when resetting the password.

Magic-link emails link to a UI page (`/login/magic-link` by default) that POSTs the token to the API. The verify API does not accept GET requests with tokens in the query string.

---

## Account status and invites

- `users.status` (`active`, `pending`, `suspended`) is enforced on every authentication path (credentials, OAuth, passkey, magic link).
- When `invites.requireInviteCode` is enabled, registration must include a valid invite code; OAuth self-registration is blocked.
- When `invites.requireApproval` is enabled, new accounts are created as `pending` and cannot sign in until approved.

Admin APIs require a **fully authenticated** session (including completed 2FA when enabled). Mutating admin routes also require same-origin protection.

Sensitive security settings (`passwordPolicy.checkBreachedPasswords`, `accountLockout.enabled`, invite gate flags, etc.) cannot be overridden via the admin panel at runtime.

---

## Rate limiting and client IP

- In production (`server.environment: "production"`), `rateLimit.store` must be `"postgres"` or the app fails at startup.
- `X-Forwarded-For` / `X-Real-IP` are honored only when `security.trustForwardedHeaders: true`.

---

## Session management

Users must be able to:

- view active sessions
- identify the current session
- revoke specific sessions
- revoke all other sessions

Session revocation is enforced server-side. Revoked sessions must not remain authorized.

Optional **single active session** mode (`sessions.singleActiveSession: true` in `createSecureAuth`) revokes all other sessions automatically after each successful login. Default is multi-session (unchanged). See [customization.md](./customization.md).

Session tokens are stored hashed server-side where applicable.

---

## TOTP

TOTP secrets are encrypted at rest (`auth.twoFactorEncryptionKey` in config).

Backup codes are hashed and one-time use.

TOTP verification endpoints are rate-limited.

During credentials login with 2FA enabled, the pending login challenge is stored in an **httpOnly cookie** (not `sessionStorage`). Middleware rewrites password-manager POSTs to form handler routes.

Passkey login follows the same policy: when TOTP 2FA is enabled, passkey verification alone does not finalize the session. The verify endpoint creates a pending login challenge (same cookie and `/login/2fa` flow as credentials). A fully authenticated session is created only after valid TOTP verification.

---

## Passkeys

Account passkey login is account authentication only:

- Secure-auth never uses WebAuthn signatures or PRF as encryption keys.
- Secure-auth never receives PUK, PRF output, an ephemeral private key, UVK, or decrypted vault data.
- WebAuthn challenges are single-use and consumed atomically.
- Passkey sign-in is a strong primary factor but **does not bypass TOTP** when app-level 2FA is enabled. Users must complete the same TOTP step as credentials/OAuth logins.

Generated authentication options prefer an available local authenticator without excluding a
synced or cross-device passkey. Secure-auth normalizes duplicate stored transports, orders
`internal` before `hybrid`, and emits advisory WebAuthn Level 3 `client-device`, `hybrid` hints only
when both transports are advertised. Browsers may ignore hints; the exact allow-list, hybrid
fallback, required user verification, credential verification, RP ID, and origin checks remain
authoritative. No authenticator attachment is forced and no credential or database row is changed.

Consumers may opt into sharing the same credential with an independent browser-only capability. The
packages remain independent: secure-auth verifies account authentication; the consumer owns the
additional capability. Secure-auth recursively strips documented PRF-derived fields in its client helpers and
rejects documented PRF-derived fields anywhere in the bounded request graph. PRF output must never reach secure-auth,
another server route, logs, analytics, storage, or URL state.

`webauthn.getLoginAuthenticationExtensions` is a server-only composition point. It runs only for a
resolved account with a non-empty sign-in allow-list and may add bounded JSON-safe extension input;
it cannot replace the challenge, RP ID, required user verification, or allow-list. The callback's
`userId` and `credentialIds` are never emitted as separate response metadata by secure-auth.
Consumers must return the same public extension shape for equivalent sign-in accounts rather than
turning this callback into an oracle for private feature enrollment.

Signature counters and the monotonic `counter_revision` are updated through compare-and-set against
the single authoritative credential row. Nonzero counters must strictly advance. Authenticators
that report `0 -> 0` are supported because every accepted assertion still increments the revision.

Consumer-owned vault ceremonies must use a feature-specific, single-use challenge audience. The
secure-auth `registration` audience remains reserved for account registration and must not be reused
as a vault enrollment or unlock challenge.

The opt-in `webauthn.portableVaultGrants` module provides that distinct ceremony without importing
vault-core. It requires a same-origin, fully authenticated account session (TOTP complete), selects
exactly one credential, requires UV, and compare-and-sets the authoritative counter/revision. Its
ES256 grant binds `purpose`, `action`, opaque UUID subject, app, credential, UUID request/JTI, and
short expiry; unlock also binds an envelope UUID and RFC 7638 ephemeral P-256 thumbprint. Login
never emits this grant.

Enrollment/revocation capability flags change only after an ES256 broker receipt matches the
session-bound operation, app, subject, action, credential, request, grant JTI, and envelope and is
atomically consumed. Unlock receipts are consumed as well before the app installs the restored UVK.
Grant/receipt operation storage contains hashes and metadata only. See
[portable-vault-grants.md](./portable-vault-grants.md).

See [passkey-credential-interoperability.md](./passkey-credential-interoperability.md).

Configure via `webauthn` in `createSecureAuth(config)`. The configured `webauthn.origin` must match
how users reach the app. `originAliasPolicy` defaults to `"apex-www"` for backward compatibility.
Production apps that redirect all traffic to one canonical host should set
`originAliasPolicy: "none"`; verification then accepts only the primary origin and exact
`webauthn.origins` entries. A redirect is not a substitute for strict verification because an
assertion may reach the verify route independently of page navigation.

---

## CAPTCHA (Cloudflare Turnstile)

Optional bot protection for **credentials registration** and **credentials login** only.

- Disabled by default (`captcha.enabled: false`).
- Enable per flow via `captcha.pages.register` and `captcha.pages.login`.
- The package validates Turnstile tokens server-side via Cloudflare Siteverify before processing auth actions.
- `captcha.secretKey` is server-only; `secureAuth.uiConfig.captcha` exposes only `siteKey` and enabled pages.
- OAuth, passkey, 2FA, and password reset flows are **not** CAPTCHA-protected in this release.
- Missing or invalid tokens fail closed with a generic user message.

Obtain keys from the [Cloudflare Turnstile dashboard](https://developers.cloudflare.com/turnstile/) and map env vars in your app (see [configuration-reference.md](./configuration-reference.md)).

---

## OAuth

Supported providers: Google, Apple, GitHub, Microsoft.

Rules:

- Request minimal identity scopes only.
- Do not persist OAuth access/refresh tokens unless explicitly required and documented.
- Enforce safe account linking to prevent provider takeover.
- Public UI config may expose only effective provider IDs through `oauthProviderIds`; OAuth client
  IDs, secrets, tenant details, and tokens remain server-only.

Apple Sign in typically requires HTTPS and a real or tunneled domain.

---

## Account deletion

Account deletion requires:

- explicit confirmation phrase
- re-authentication or equivalent security gate
- revocation of all active sessions
- safe audit event (no sensitive metadata)

### OAuth-only and passkey-only accounts

Passwordless accounts use session-bound re-auth:

1. Authenticated session with 2FA complete when enabled.
2. Confirmation phrase: `DELETE MY ACCOUNT`.
3. Valid, active account session within **15 minutes**.
4. Session `authMethod` aligned with account primary factor.
5. Rate limit: `account.delete` (3/hour per user).

Provider-native step-up (`prompt=login`) is not implemented in `0.1.x`.

---

## Audit logs

Audit logs must not include passwords, tokens, TOTP codes, backup codes, OAuth secrets, SMTP secrets, or sensitive request bodies. Metadata is sanitized before persistence.

---

## Rate limiting

Rate limiting applies to sensitive flows:

- login, registration, TOTP verification
- password reset request, email verification resend
- passkey verification, session revocation, account deletion

Rate-limit identifiers use hashed or masked values where they contain PII.

---

## Logging

Use the package `safeLogger` with redaction. Production logs must not print reset links, verification links, session tokens, OAuth tokens, or SMTP credentials.

---

## Secret rotation checklist

If credentials were ever exposed, rotate:

- [ ] `NEXTAUTH_SECRET`
- [ ] `TWO_FACTOR_SECRET_ENCRYPTION_KEY`
- [ ] OAuth client secrets
- [ ] `DATABASE_URL` password
- [ ] SMTP credentials
- [ ] `GITHUB_PACKAGES_TOKEN`

---

## Dependency audit

- **Policy:** [security/dependency-audit.md](./security/dependency-audit.md)
- **Before release:** `npm run audit:security` (blocks high/critical)
- **Publish CI:** audit gate in `.github/workflows/publish-secure-auth.yml`

Overrides in root `package.json` pin safe transitive versions when NextAuth v4 or Next.js still declare vulnerable ranges (see dependency audit doc for residual risk).

---

## Production readiness gate (1.0.0)

Before calling the package production-ready:

- [ ] OAuth-only account deletion policy implemented and tested
- [ ] Email delivery abstracted behind `EmailProvider`
- [ ] Single composition root (`createSecureAuth`) with explicit config
- [ ] No package runtime `process.env` reads
- [ ] Internal wiring not exposed as public API
- [ ] npm audit clean or exceptions documented
- [ ] Security review sign-off documented

---

## Stop condition

If a security-sensitive decision is unclear, stop and write:

```text
TODO_SECURITY_REVIEW_REQUIRED:
This behavior affects account security and requires human review.
```

Do not ship ambiguous security behavior.

---

## Test coverage

Security-sensitive code must maintain:

```text
Statements >= 90%
Lines      >= 90%
Functions  >= 90%
Branches   >= 90%
```

Coverage thresholds must not be lowered without explicit architectural review.

Security-sensitive flows that require tests: authentication (password, OAuth, passkey), token reuse/expiry, TOTP, passkey challenges, portable vault grant/receipt replay and scope binding, **passkey capability boundaries** (account list/delete vs vault-only credentials), session revocation, account deletion, logging redaction, and module boundary violations.

### Passkey capability boundaries

Account authentication and other WebAuthn uses (for example vault unlock in downstream apps) may share `passkey_credentials`.

- **`sign_in_enabled`** — credential may be used for account login (passkey login filters on this flag). Account passkey registration `excludeCredentials` includes only credentials with this flag set.
- **`vault_unlock_enabled`** — credential is used by another security feature; account settings must not revoke it. Vault-only credentials are omitted from account registration `excludeCredentials`.
- Account **`GET /api/account/passkeys`** exposes safe capability metadata; **`DELETE /api/account/passkeys/:id`** rejects non-removable credentials (409).
- Account **`POST /api/account/passkeys/register`** creates new credentials with `sign_in_enabled: true` and `vault_unlock_enabled: false` only — it does not upgrade vault-only rows.
- Account **`POST /api/account/passkeys/:id/enable-sign-in`** explicitly upgrades a vault-only row only after a fully authenticated session, exact-credential UV-required assertion, separate challenge audience, and counter/revision compare-and-set. Package UI exposure is explicit opt-in and defaults off.
- Dual-capability credentials (`sign_in_enabled` + `vault_unlock_enabled`) are not removable from account settings until the owning app disables vault unlock.
- Account deletion is rejected while any active credential still has `vault_unlock_enabled`; complete receipt-gated broker revocation first.

**Platform limitation:** Some authenticators do not allow a second passkey per RP on one device. Use
the explicit capability-upgrade flow to reuse the existing vault-only credential; do not attempt a
second registration.

See [consumer-passkey-capability-boundaries.md](./consumer-passkey-capability-boundaries.md),
[passkey-registration-capability-boundary-audit.md](./passkey-registration-capability-boundary-audit.md),
and [passkey-credential-interoperability.md](./passkey-credential-interoperability.md).
