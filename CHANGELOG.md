# Changelog

All notable changes to this monorepo are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.1-internal] - 2026-06-11

### Added

- **Package hardening phase** — [docs/PACKAGE_HARDENING_REPORT.md](docs/PACKAGE_HARDENING_REPORT.md) documents full audit.
- **`SecureAuthConfig` extensions** — `passwordPolicy`, `sessions`, `rateLimit`, `server.cookieSecure`, `debug.authTrace`.
- **Config resolvers** — `src/core/config-resolvers.ts`, `src/core/app-brand.ts`.
- **Cookie name builders** — `buildLoginPendingTokenCookieName(slug)`, `buildTwoFactorLoginChallengeCookieName(slug)`.
- **Brand mark builders** — `buildBrandMarkSvg(name)`, `buildBrandMarkDataUrl(name)`.
- **Package unit tests** — session config, session IP, user-agent metadata, login pending cookie.

### Changed

- **Single route path** — `createSecureAuth(config).routes.*` only; removed `createRouteHandlers` and 501 stubs.
- **No package runtime `process.env`** — consumer maps env → `createSecureAuth(config)`.
- **`getPasswordPolicyConfig`** — merges explicit overrides; no env parsing in package.
- **`styles.css`** — `@source "./dist/modules/ui"` only (published artifact safe).
- **Microsoft OAuth helpers** — require explicit `env` argument (no default `process.env`).

### Removed

- `packages/secure-auth/src/server/routes/index.ts` (legacy 501 handlers).
- ~88 `@deprecated` re-export shims under `src/server/*`, `src/lib/*`, UI.
- Transitional modules: `auth-config-store`, `db-context`, `init-runtime`, `lib/brand.ts`.
- Client exports: `clearLoginPendingTokenCookie`, `clearLoginChallengeCookie`, cookie option getters (server-only).
- Static cookie constants and env-driven password policy reads from public client API.

### Fixed

- Cookie setter bug in credentials login form handlers (`getLoginPendingTokenCookieName()` call).
- Route test mocks targeting removed `@/lib/auth/session` path.

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

[0.1.1-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.1-internal
[0.1.0-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/v0.1.0-internal
