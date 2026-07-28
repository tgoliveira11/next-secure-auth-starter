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
- Generic passkey option composition may add only bounded, public, JSON-safe extension input after
  account resolution. It must not alter the challenge, RP ID, required user verification, or
  credential allow-list, and must not expose resolved account identifiers as separate metadata.
- WebAuthn PRF output and other derived browser secrets must be stripped from server payloads,
  retained only through the verified browser callback, and discarded instead of being persisted
  across TOTP.
- A production app that redirects to one canonical hostname must also set
  `webauthn.originAliasPolicy: "none"`; navigation redirects do not constrain the assertion origin
  accepted by the verification endpoint.

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

Use the package `safeLogger` with redaction. No reset/verification links in production logs.

## Audit

Sanitize metadata — no passwords, tokens, or secrets in audit events.

## Stop condition

If unsure about security-sensitive behavior, stop and add:

```text
TODO_SECURITY_REVIEW_REQUIRED:
This behavior affects account security and requires human review.
```

Update [docs/security.md](../../docs/security.md) when security behavior changes.
