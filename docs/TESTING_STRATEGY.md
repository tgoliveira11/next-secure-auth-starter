# Testing Strategy

## Coverage target

All test coverage metrics must be at least **95%**.

```text
Statements: >= 95%
Lines:      >= 95%
Functions:  >= 95%
Branches:   >= 95%
```

No threshold may be lowered to make tests pass.

Coverage is enforced in CI once Phase 1 begins (Vitest configuration with strict thresholds).

## Test types

The starter should include:

| Type | Purpose |
| --- | --- |
| Unit tests | Pure functions, policies, sanitization, hashing |
| Service tests | Module services with mocked dependencies |
| API route tests | HTTP handlers, status codes, response shape |
| UI tests | Component rendering, user interactions (Testing Library) |
| Accessibility smoke tests | Critical account flows meet basic a11y |
| Security regression tests | No token/password leakage in responses or logs |
| Boundary tests | Forbidden imports blocked statically |
| Integration tests | Database + service flows where valuable |

Playwright E2E tests are optional but recommended for critical auth journeys.

## Auth flow tracing (local debugging)

When debugging password-manager or 2FA login issues, enable auth tracing in `.env.local`:

```text
AUTH_DEBUG_TRACE=true
NEXT_PUBLIC_AUTH_DEBUG_TRACE=true
```

With tracing on:

- Server logs emit `auth-trace` entries for login POST rewrites, redirects, 2FA page renders, and challenge cookie status.
- `303` responses include an `X-Auth-Trace` header naming the redirect reason.
- Login and 2FA pages show an on-page **Auth debug trace** panel (client pathname changes log to the browser console as `[auth-trace:client]`).
- `GET /api/auth/login/trace` returns the recent in-memory event ring buffer.

Tracing is off by default and must not be enabled in production.

## Critical flows to test

### Authentication

- register
- login
- logout
- password login
- OAuth login (each provider)
- passkey login
- failed login (generic error, no enumeration)
- rate-limited login

### Email verification

- token generated with sufficient entropy
- token stored hashed
- token expires
- token is single-use
- resend is rate-limited
- no account enumeration in API responses

### Password reset

- forgot password returns generic response
- reset token stored hashed
- reset token expires
- reset token is single-use
- password updated successfully
- sessions invalidated per design

### Change password

- current password required
- wrong current password rejected
- password policy warn/enforce modes
- sessions handled per design (e.g. revoke others)

### TOTP

- setup generates secret and QR/recovery material
- verify accepts valid code within window
- disable requires re-auth or equivalent gate
- invalid code rejected
- rate limiting on verify
- backup codes one-time use (if implemented)

### Passkeys

- challenge creation
- atomic challenge consumption (no reuse)
- registration
- login
- unknown credential rejected
- revoked credential rejected (if supported)

### Sessions

- list sessions with metadata
- current session indicator
- revoke one session
- revoke all other sessions
- revoked sessions cannot authorize subsequent requests

### Account deletion

- confirmation required
- re-auth or security gate enforced
- user data removed or anonymized per policy
- safe audit event emitted (no sensitive metadata)

## Security regression tests

Must verify:

- no raw tokens in API responses
- no raw tokens in logs (use logger test doubles)
- no password plaintext in logs
- no OAuth secrets in logs
- no SMTP secrets in logs
- no frontend imports of database clients
- no server-only modules imported into client components

## Boundary tests

Boundary tests must enforce module separation defined in [MODULE_BOUNDARIES.md](MODULE_BOUNDARIES.md).

Use static analysis (e.g. dependency-cruiser, eslint-plugin-import, or custom scripts) to fail CI on forbidden imports.

## Test data and fixtures

- Use factories or builders for users, sessions, and tokens.
- Never commit real credentials or production-like secrets to the repo.
- Hash fixtures must use the same algorithms as production code.

## When tests are required

Every change that affects:

- authentication or sessions
- tokens or secrets
- OAuth, TOTP, or passkeys
- rate limiting or audit logging
- module boundaries

…must include tests in the same change.

## Documentation updates

When testing strategy, tooling, or coverage enforcement changes, update:

- this document
- [.cursor/rules/testing.md](../.cursor/rules/testing.md)
- README.md if commands or scripts change
