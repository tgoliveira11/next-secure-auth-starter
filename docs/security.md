# Security

**Maturity:** `@tgoliveira/secure-auth@0.1.20-internal` is experimental — **not production-ready**.

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

Authentication is **account access only**. This package must not implement vault unlock, encrypted letter storage, or product-specific cryptography.

Passkeys and TOTP are for **account authentication only** — not encryption key derivation or vault unlock.

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

Passkeys are account authentication only:

- Do not use WebAuthn signatures or PRF as encryption keys.
- Do not introduce vault unlock or trusted-device vault behavior.
- WebAuthn challenges are single-use and consumed atomically.
- Passkey sign-in is a strong primary factor but **does not bypass TOTP** when app-level 2FA is enabled. Users must complete the same TOTP step as credentials/OAuth logins.

Configure via `webauthn` in `createSecureAuth(config)`. The configured `webauthn.origin` must match how users reach the app; the package also accepts the paired **apex ↔ www** origin automatically (e.g. `https://example.com` and `https://www.example.com`). Use optional `webauthn.origins` for additional hostnames (e.g. subdomains).

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
Statements >= 95%
Lines      >= 95%
Functions  >= 95%
Branches   >= 95%
```

Coverage thresholds must not be lowered without explicit architectural review.

Security-sensitive flows that require tests: authentication (password, OAuth, passkey), token reuse/expiry, TOTP, passkey challenges, **passkey capability boundaries** (account list/delete vs vault-only credentials), session revocation, account deletion, logging redaction, and module boundary violations.

### Passkey capability boundaries

Account authentication and other WebAuthn uses (for example vault unlock in downstream apps) may share `passkey_credentials`.

- **`sign_in_enabled`** — credential may be used for account login (passkey login filters on this flag). Account passkey registration `excludeCredentials` includes only credentials with this flag set.
- **`vault_unlock_enabled`** — credential is used by another security feature; account settings must not revoke it. Vault-only credentials are omitted from account registration `excludeCredentials`.
- Account **`GET /api/account/passkeys`** exposes safe capability metadata; **`DELETE /api/account/passkeys/:id`** rejects non-removable credentials (409).
- Account **`POST /api/account/passkeys/register`** creates new credentials with `sign_in_enabled: true` and `vault_unlock_enabled: false` only — it does not upgrade vault-only rows.
- Dual-capability credentials (`sign_in_enabled` + `vault_unlock_enabled`) are not removable from account settings until the owning app disables vault unlock.

**Platform limitation:** Even with correct exclude lists, some authenticators may not allow multiple passkeys per RP on one device. A future explicit capability-upgrade flow may be needed to enable account sign-in on an existing vault-only passkey.

See [consumer-passkey-capability-boundaries.md](./consumer-passkey-capability-boundaries.md) and [passkey-registration-capability-boundary-audit.md](./passkey-registration-capability-boundary-audit.md).
