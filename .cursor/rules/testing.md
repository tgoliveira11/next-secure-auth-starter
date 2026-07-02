# Cursor Rule — Testing

Apply these rules for all code changes in this monorepo.

## Coverage thresholds (non-negotiable)

```text
Statements >= 90%
Lines      >= 90%
Functions  >= 90%
Branches   >= 90%
```

Do not lower thresholds.

## Coverage scope (`@tgoliveira/secure-auth`)

The Vitest gate covers the **unit-test surface**: core, lib, server route handlers, policies, and module `lib/` layers.

Excluded from the gate (validated elsewhere):

- UI page/feature/primitive trees (`src/modules/ui/pages`, `features`, `primitives`, `react/**`)
- Service and repository implementations (`src/modules/**/services`, `repositories`)
- Browser-only client barrels and WebAuthn ceremony helpers
- Integration-only adapters (e.g. Postgres rate-limit adapter)
- Route registry wiring (`create-routes.ts`) — smoke-tested via harness/E2E

When adding code inside the gated surface, add tests in the same change.

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
- `SecureAuthUIProvider` / `useSecureAuthUi` page defaults

## Test types

- Unit tests for pure logic (security, policies, sanitization, ui-config)
- Service tests with mocked dependencies
- Route handler tests for HTTP contracts
- Component tests with Testing Library for account UI
- Boundary/static import tests in CI

## Test hygiene

- Prefer **Vitest projects** (`node` for `*.test.ts`, `happy-dom` for `*.test.tsx`) — see [docs/test-ci-performance-playbook.md](../../docs/test-ci-performance-playbook.md).
- Use factories/fixtures — no real secrets in repo.
- Assert generic error messages where account enumeration must be prevented.
- Mock email and OAuth in unit/service tests; use Mailpit or integration setup for E2E.

## Documentation

When testing strategy or tooling changes, update this file, [docs/test-ci-performance-playbook.md](../../docs/test-ci-performance-playbook.md), and [docs/security.md](../../docs/security.md) in the same change.
