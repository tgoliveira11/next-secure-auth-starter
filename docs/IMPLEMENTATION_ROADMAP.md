# Implementation Roadmap

Phased plan for building `next-secure-auth-starter`. Each phase should land with tests, documentation updates, and ≥ 95% coverage on touched code.

## Phase 0 — Documentation and project context ✅

**Current phase.**

Deliverables:

- README.md, ARCHITECTURE.md, SECURITY.md, AGENTS.md
- docs/* (purpose, boundaries, usage, testing, roadmap)
- .cursor/rules/* (architecture, security, testing, documentation)
- STARTER_CONTEXT_PROMPT.md (bootstrap prompt for new sessions)

No application code.

## Phase 1 — Project skeleton

Create the Next.js application structure.

Include:

- TypeScript strict mode
- ESLint and formatting
- Vitest with 95% coverage thresholds
- Basic UI shell (mobile-first layout)
- PostgreSQL + Drizzle setup
- Docker Compose for PostgreSQL and Mailpit
- `.env.example` with documented variables
- Initial CI pipeline (lint + test)

Exit criteria: app boots, DB connects, test runner enforces coverage thresholds.

## Phase 2 — Core account model

Implement foundational data layer and shared services:

- users table and repository
- accounts/providers (Auth.js adapter tables)
- sessions storage
- audit log persistence
- rate limiting (interface + in-memory adapter)
- email provider abstraction (console + SMTP + Mailpit)
- security module (hashing, tokens, logger, env validation)

Exit criteria: migrations run cleanly, module public APIs defined, boundary tests scaffolded.

## Phase 3 — Email/password authentication

Implement:

- registration
- login / logout
- password hashing and policy (warn/enforce modes)
- email verification (token hash, expiry, single-use)
- forgot/reset password
- change password

Exit criteria: full email/password flow works locally with Mailpit, all flows tested, no account enumeration.

## Phase 4 — OAuth

Implement:

- Google OAuth
- Apple Sign in
- Microsoft sign-in
- safe account linking policy
- OAuth-only account handling (no password set until explicit action)

Exit criteria: each provider login tested (or documented skip for Apple in CI), minimal scopes enforced.

## Phase 5 — Passkeys

Implement:

- passkey registration
- passkey login
- challenge atomic consumption
- passkey listing and removal

Exit criteria: WebAuthn flows tested with mocks/stubs; no PRF or vault behavior.

## Phase 6 — TOTP

Implement:

- optional TOTP enrollment
- setup / verify / disable
- backup codes (if feasible)
- password-login TOTP challenge

Exit criteria: TOTP secrets encrypted at rest, rate limits on verify, full test coverage.

## Phase 7 — Session management

Implement:

- active session list UI and API
- revoke one session
- revoke all other sessions
- session metadata (masked IP, parsed user-agent, last active)

Exit criteria: revoked sessions fail authorization immediately.

## Phase 8 — Account deletion

Implement:

- strong confirmation UI
- re-auth or security gate
- data removal/anonymization
- audit event on deletion

Exit criteria: deleted accounts cannot authenticate; audit log is safe.

## Phase 9 — Hardening

Implement:

- PostgreSQL rate-limit adapter
- security regression test suite
- accessibility smoke tests on account flows
- boundary test enforcement in CI
- production-readiness documentation updates

Exit criteria: CI green, all security regression tests pass, docs reflect final env vars and routes.

## Phase 10 — Starter usability validation

Validate that a new project can:

- fork the template
- configure env vars from `.env.example`
- run migrations and start the app
- complete all core account flows
- customize branding without touching vault/letter code

Exit criteria: documented "happy path" from fork to working auth in under one hour for an experienced developer.

## Documentation rule

Every phase that changes architecture, security behavior, environment variables, providers, routes, or tests must update relevant docs in the **same change**.

See [.cursor/rules/documentation.md](../.cursor/rules/documentation.md).

## Security stop condition

If a phase requires a security decision that is not defined in [SECURITY.md](../SECURITY.md) or this roadmap, stop and add:

```text
TODO_SECURITY_REVIEW_REQUIRED:
This behavior affects account security and requires human review.
```

Do not proceed until reviewed.
