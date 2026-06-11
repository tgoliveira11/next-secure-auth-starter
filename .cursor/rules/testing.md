# Cursor Rule — Testing

Apply these rules for all code changes in `next-secure-auth-starter`.

## Coverage thresholds (non-negotiable)

```text
Statements >= 95%
Lines      >= 95%
Functions  >= 95%
Branches   >= 95%
```

Do not lower thresholds. Do not exclude files to artificially pass coverage.

## Required test coverage for changes

Every PR that touches behavior must include tests for:

- happy path
- relevant failure paths
- security-sensitive edge cases (token reuse, expiry, rate limits, revocation)

## Security-sensitive flows (must have tests)

- authentication (password, OAuth, passkey)
- email verification and password reset tokens
- change password
- TOTP setup/verify/disable
- passkey challenge creation and atomic consumption
- session list, revoke one, revoke all others
- account deletion
- logging redaction (no tokens/passwords in output)
- module boundary violations (static tests)

## Test types

- Unit tests for pure logic (security, policies, sanitization)
- Service tests with mocked dependencies
- Route handler tests for HTTP contracts
- Component tests with Testing Library for account UI
- Boundary/static import tests in CI

## Test hygiene

- Use factories/fixtures — no real secrets in repo.
- Assert generic error messages where account enumeration must be prevented.
- Mock email and OAuth in unit/service tests; use Mailpit or integration setup for E2E.

## Documentation

When testing strategy or tooling changes, update docs/TESTING_STRATEGY.md and this file in the same change.

See [docs/TESTING_STRATEGY.md](../../docs/TESTING_STRATEGY.md) for the full critical-flow checklist.
