# Security

## Core security principles

`next-secure-auth-starter` is designed around secure defaults.

The system must protect:

- account credentials
- session tokens
- OAuth secrets
- TOTP secrets
- password reset tokens
- email verification tokens
- audit metadata
- rate-limit identifiers
- user privacy

Authentication is **account access only**. This starter must not implement vault unlock, encrypted letter storage, or any product-specific cryptography.

## Do not store secrets in plaintext

The application must never store these values in plaintext:

- passwords
- session tokens
- password reset tokens
- email verification tokens
- TOTP codes
- TOTP backup codes
- OAuth client secrets
- SMTP credentials
- passkey challenge secrets
- raw account session tokens

## Passwords

Passwords must be hashed with a strong password hashing function (e.g. Argon2 or bcrypt with appropriate cost parameters).

Password strength must be assessed.

Password policy is configurable through environment variables under **Account policy** in `.env.example`.

Recommended policy modes:

```text
PASSWORD_POLICY_ENFORCEMENT=off | warn | enforce
```

Default recommendation:

```text
PASSWORD_POLICY_ENFORCEMENT=warn
```

## Email verification policy

Email verification is optional by default. Users can sign in before confirming their email unless you opt in to stricter behavior.

```text
EMAIL_VERIFICATION_SEND_ON_REGISTER=true
EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN=false
```

When `EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN=true`, email/password and passkey sign-in for credentials accounts require a verified email first.

## Email verification and password reset tokens

Tokens must be:

- cryptographically random
- stored hashed (never plaintext)
- single-use
- time-limited
- consumed atomically
- never logged in production

API responses must not leak whether an email address is registered (no account enumeration).

## Session management

Users must be able to:

- view active sessions
- identify the current session
- revoke specific sessions
- revoke all other sessions

Session revocation must be enforced server-side.

A revoked session must not remain authorized.

Session tokens must be stored hashed server-side where applicable.

## TOTP

TOTP is account authentication only.

TOTP secrets must be encrypted at rest.

Backup codes, if implemented, must be hashed and one-time use.

TOTP verification endpoints must be rate-limited.

During credentials login with 2FA enabled, the pending login challenge is stored in an **httpOnly cookie** (not `sessionStorage`) so password managers and full-page navigations cannot drop the challenge before the OTP step. The cookie is cleared when verification succeeds or the challenge expires.

Password managers often POST to the page URL (`/login`, `/login/2fa`) instead of a separate API path. Middleware rewrites those POST requests to `/api/auth/login/start-form` and `/api/auth/login/verify-2fa-form`. Login and 2FA credential forms are server-rendered HTML forms with no React submit interception.

## Passkeys

Passkeys in this starter are account authentication only.

- Do not use WebAuthn signatures or PRF as encryption keys.
- Do not introduce vault unlock or trusted-device vault behavior.
- WebAuthn challenges must be single-use and consumed atomically.

## OAuth

OAuth providers are account authentication only.

Supported providers:

- Google
- Apple
- Microsoft

Rules:

- Do not request unnecessary scopes.
- Default to minimal identity scopes.
- Do not store OAuth access tokens or refresh tokens unless explicitly needed and documented.
- Account linking policy must prevent insecure provider takeover.

Apple Sign in typically requires HTTPS and a real or tunneled domain — document this in deployment guides.

## Audit logs

Audit logs must not include:

- passwords
- tokens
- TOTP codes
- backup codes
- OAuth secrets
- SMTP secrets
- sensitive request bodies

Audit metadata must be sanitized before persistence.

## Rate limiting

Rate limiting must be applied to sensitive flows:

- login
- registration
- TOTP verification
- password reset request
- email verification resend
- passkey verification
- session revocation
- account deletion

Rate-limit identifiers should use hashed or masked values where they contain PII.

## Logging

Logs must be safe by default.

Sensitive keys and values must be redacted through the `security` module logger.

Production logs must not print:

- reset links
- verification links
- session tokens
- OAuth tokens
- SMTP credentials

## Account deletion

Account deletion must:

- require explicit confirmation
- require re-authentication or an equivalent security gate
- revoke all active sessions
- remove or anonymize user data per documented policy
- emit a safe audit event (no sensitive data in metadata)

## Security review stop condition

If a security-sensitive decision is unclear, stop and write:

```text
TODO_SECURITY_REVIEW_REQUIRED:
This behavior affects account security and requires human review.
```

Do not ship ambiguous security behavior.

## Coverage

Security-sensitive code must be tested.

Minimum coverage target:

```text
Statements: >= 95%
Lines:      >= 95%
Functions:  >= 95%
Branches:   >= 95%
```

Coverage thresholds must not be lowered without explicit architectural review.

See [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) for security regression and boundary test requirements.
