# Security

**Maturity:** `@tgoliveira/secure-auth@0.1.16-internal` is experimental — **not production-ready**.

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

Security-sensitive flows that require tests: authentication (password, OAuth, passkey), token reuse/expiry, TOTP, passkey challenges, session revocation, account deletion, logging redaction, and module boundary violations.
