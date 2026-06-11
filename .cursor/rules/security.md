# Cursor Rule — Security

Apply these rules for any change touching authentication, sessions, tokens, secrets, or user data.

## Never store or log secrets in plaintext

Forbidden plaintext storage and logging:

- passwords
- session tokens
- password reset tokens
- email verification tokens
- TOTP codes and backup codes
- OAuth client secrets and tokens
- SMTP credentials
- passkey challenge secrets

## Account auth only

- Passkeys and TOTP are for **account authentication** — not vault unlock or encryption key derivation.
- Do not implement WebAuthn PRF vault envelopes or trusted-device vault behavior.
- Do not copy product-specific cryptography from other projects.

## Tokens

- Generate with cryptographic randomness.
- Store hashed.
- Single-use, time-limited, atomically consumed.
- Never return raw tokens in API responses after initial issuance.
- Never log tokens in production.

## OAuth

- Request minimal identity scopes only.
- Do not persist OAuth access/refresh tokens unless explicitly required and documented.
- Enforce safe account linking to prevent provider takeover.

## Rate limiting

Apply to: login, registration, TOTP verify, password reset, verification resend, passkey verify, session revoke, account deletion.

## Logging

Use the `security` module logger with redaction. No reset/verification links in production logs.

## Audit

Sanitize metadata — no passwords, tokens, or secrets in audit events.

## Stop condition

If unsure about security-sensitive behavior, stop and add:

```text
TODO_SECURITY_REVIEW_REQUIRED:
This behavior affects account security and requires human review.
```

Update [SECURITY.md](../../SECURITY.md) when security behavior changes.
