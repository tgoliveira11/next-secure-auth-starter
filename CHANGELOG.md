# Changelog

All notable changes to this monorepo are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0-internal] - 2026-06-11

### Added

- **Monorepo layout** — `packages/secure-auth` (`@tgoliveira/secure-auth`) + `apps/starter` integration harness.
- **`createSecureAuth(config)`** — single factory for auth domain wiring (db, email, OAuth, WebAuthn, UI).
- **Public package exports** — `/next`, `/react`, `/react/client`, `/client`, `/server`, `/drizzle/schema`, `/email`.
- **Route handler migration** — auth/account API handlers in package; starter exposes thin App Router wrappers.
- **`EmailProvider` abstraction** — package sends email only through injected provider; SMTP/console live in starter.
- **Security hardening** — OAuth-only account deletion policy (session-bound re-auth, 15-minute window).
- **Tests** — 123 package tests, 230 starter tests; route tests in package vitest.
- **Documentation** — architecture, security hardening, migration guide, publishing guide, documentation audit.

### Changed

- **Starter deduplication (Phase 10)** — removed duplicated auth modules and `server/*` shims from starter.
- **Runtime binding** — merged db/config init into `secure-auth-runtime` (explicit `createSecureAuth` binding).
- **Migrations** — SQL migrations live in `packages/secure-auth/migrations/`.

### Removed

- Pre-monorepo root `src/` application tree (replaced by `apps/starter`).
- Root `drizzle/` (replaced by package migrations).
- `STARTER_CONTEXT_PROMPT.md` (obsolete bootstrap prompt).
- Package SMTP/nodemailer delivery code (moved to starter adapter).

### Security

- OAuth-only account deletion requires fresh, provider-matched account session.
- Account deletion routes require fully authenticated user (2FA-complete when enabled).

### Known limitations

- **Experimental** — not production-ready; version `0.1.0-internal`.
- **Repository DI** — services use runtime-bound `db` proxy; constructor injection planned for 0.2.x.
- **npm audit** — 11 transitive vulnerabilities (documented in `docs/security-hardening.md`).
- **OAuth E2E** — policy unit tests; manual provider validation required for CI gaps.

[0.1.0-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/v0.1.0-internal
