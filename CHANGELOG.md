# Changelog

All notable changes to this monorepo are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.18-internal] - 2026-06-11

### Added

- **Generic password UI** — `PasswordStrengthField` and `PasswordSetupFields` exported from `@tgoliveira/secure-auth/react/client` for non-auth sensitive password flows (vault, encryption, recovery, etc.).
- **Password validation helpers** — `resolvePasswordPolicy`, `validatePasswordAgainstPolicy`, `validatePasswordConfirmation`, `validatePasswordSetup`, `getPasswordPolicyRequirements`, `calculatePasswordStrength`, and related types in `@tgoliveira/secure-auth/client/password-policy`.
- **Docs** — [generic-password-components.md](docs/generic-password-components.md) with vault password examples.

### Changed

- **Auth password screens** — reset-password and change-password settings use `PasswordSetupFields` and shared setup validation helpers.
- **`PasswordStrengthField`** — generalized props (`policy`, `feedbackPosition`, `onValidityChange`, `name`, uncontrolled mode); backward-compatible with `policyConfig` / `passwordStrengthPosition`.
- **`@tgoliveira/secure-auth/react` barrel** — `"use client"` directive so App Router re-exports build under Next.js 16.
- **`SECURE_AUTH_PACKAGE_VERSION`** — `0.1.18-internal`.

## [0.1.17-internal] - 2026-06-11

### Added

- **Cloudflare Turnstile CAPTCHA** — optional `captcha` config in `createSecureAuth(config)`; disabled by default; per-flow toggles for registration and credentials login (`captcha.pages.register`, `captcha.pages.login`).
- **`TurnstileCaptcha`** — client component exported from `@tgoliveira/secure-auth/react/client`; package `RegisterPage` and `CredentialsLoginForm` render it when configured.
- **Server-side Siteverify** — mandatory token validation before register and credentials login when enabled; fails closed on missing/invalid tokens or network errors.
- **Public UI config** — `secureAuth.uiConfig.captcha` exposes `siteKey` and page flags only (never `secretKey`).
- **Env mapping** — `AUTH_CAPTCHA_*` variables in starter and consumer-demo `.env.example` and `buildSecureAuthConfigFromEnv`.
- **Tests** — config defaults, Siteverify service, register/login enforcement, uiConfig secret safety.

### Changed

- **`SECURE_AUTH_PACKAGE_VERSION`** — `0.1.17-internal`.
- **Docs** — CAPTCHA configuration in README, security.md, configuration-reference.md, customization.md, consumer-quick-start.md, package-api.md.

## [0.1.16-internal] - 2026-06-11

### Fixed

- **WebAuthn origin validation** — Passkey registration and login now accept both apex and `www` variants of the configured origin (e.g. `https://example.com` and `https://www.example.com`). Fixes passkey register/verify failures when users reach the app on the paired hostname.

### Added

- **`webauthn.origins`** — optional extra allowed origins (e.g. subdomains).
- **Tests** — `getWebAuthnOrigins` apex/www and localhost alias coverage.

### Changed

- **`SECURE_AUTH_PACKAGE_VERSION`** — `0.1.16-internal`.
- **Docs** — WebAuthn origin policy in security.md, configuration-reference.md, consumer-quick-start.md.

## [0.1.15-internal] - 2026-06-11

### Fixed

- **Passkey login + TOTP 2FA** — Passkey verification no longer bypasses app-level TOTP. When `twoFactorEnabled` is true, passkey verify creates a pending login challenge (same httpOnly cookie and `/login/2fa` flow as credentials/OAuth) instead of issuing a login token. Session finalization and single-active-session revocation run only after successful TOTP verification.

### Added

- **Audit event** — `two_factor_login_required` after passkey verify when TOTP is required.
- **Tests** — Passkey login with/without 2FA, 2FA completion with passkey auth provider, route handler cookie behavior, client redirect to 2FA page.

### Changed

- **`SECURE_AUTH_PACKAGE_VERSION`** — `0.1.15-internal`.
- **Docs** — Passkey + TOTP policy in README, security.md, package-api.md, consumer-quick-start.md.

## [0.1.14-internal] - 2026-06-16

### Fixed

- **Postgres rate limiting** — `PostgresRateLimitAdapter` no longer passes raw `Date` objects into Drizzle `sql` fragments (postgres-js rejects them). Upserts now use ISO timestamp parameters, fixing passkey login and other rate-limited endpoints when `AUTH_RATE_LIMIT_STORE=postgres`.

### Added

- **Integration test** — `PostgresRateLimitAdapter` against live PostgreSQL (opt-in via `INTEGRATION_DATABASE_URL`).

### Changed

- **`SECURE_AUTH_PACKAGE_VERSION`** — `0.1.14-internal`.
- **Docs** — `AUTH_RATE_LIMIT_STORE=postgres` requires `rate_limit_buckets` migration.

## [0.1.13-internal] - 2026-06-16

### Fixed

- **Password policy override** — `passwordPolicy.minLength` (and other partial overrides) now propagate consistently through `mergePasswordPolicy()`, `createSecureAuth().passwordPolicy`, `secureAuth.uiConfig`, `SecureAuthUIProvider`, register/reset/change-password UI, `PasswordStrengthField`, client validation, server validation, and `GET /api/auth/password-policy`. Consumer apps mapping `AUTH_PASSWORD_MIN_LENGTH=5` into `createSecureAuth(config)` no longer see default `12` on package password screens.

### Added

- **`mergePasswordPolicy()`** — canonical resolver merging partial overrides with `DEFAULT_PASSWORD_POLICY`.
- **`useEffectivePasswordPolicy()`** — UI hook that always returns a full resolved policy (prop → provider → defaults).
- **`useResolvedPasswordPolicy()`** — fetches `/api/auth/password-policy` only when neither prop nor provider policy is set; defers `minLength` / guidance until loaded to avoid flashing default `12`.
- **Tests** — config merge, `createSecureAuth` uiConfig, register/reset/change-password UI, password-policy API route, and hardcoded copy guard.

### Changed

- **`SECURE_AUTH_PACKAGE_VERSION`** — `0.1.13-internal`.

## [0.1.12-internal] - 2026-06-16

### Added

- **GitHub OAuth** — optional `oauth.github` config (`clientId`, `clientSecret`); NextAuth `GitHubProvider` when both are set; social sign-in button and logo; provider id `github`; env mapping via `AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET` in starter and consumer-demo.

### Changed

- **`SECURE_AUTH_PACKAGE_VERSION`** — `0.1.12-internal`.
- **Account/session labels** — `formatAuthProvider` and `formatAuthMethod` display **GitHub** for `github` provider.

## [0.1.11-internal] - 2026-06-16

### Security

- **nodemailer** — upgraded to `8.0.11` (fixes GHSA-268h-hp4c-crq3, GHSA-wqvq-jvpq-h66f, GHSA-r7g4-qg5f-qqm2; requires `>8.0.8`). Root override includes `next-auth > nodemailer`.

### Changed

- **`SECURE_AUTH_PACKAGE_VERSION`** — `0.1.11-internal`.

## [0.1.10-internal] - 2026-06-15

### Security

- **Dependency upgrades** — `drizzle-orm@0.45.2` (SQL injection advisory), `happy-dom@20.10.3`, `drizzle-kit@0.31.10`, `next-auth@4.24.14`, `nodemailer@8.0.5`, `vitest@3.2.6`, `tsup@8.5.1`.
- **Root overrides** — `esbuild@0.28.1`, `postcss@8.5.15`, `uuid@11.1.1` (NextAuth nested), `happy-dom@20.10.3` — lockfile regenerated so overrides apply.
- **`npm audit`** — 0 vulnerabilities at release time.
- **`npm run audit:security`** — new script (`npm audit --audit-level=high`).
- **Publish CI** — audit gate before `npm publish`.
- **Documentation** — [docs/security/dependency-audit.md](docs/security/dependency-audit.md).

### Changed

- **`SECURE_AUTH_PACKAGE_VERSION`** — `0.1.10-internal`.
- **`drizzle-orm` peer** — `^0.45.2` (consumers must upgrade).

## [0.1.9-internal] - 2026-06-15

### Fixed

- **Starter test suite** — Vitest now resolves `@tgoliveira/secure-auth` from monorepo **source** (not a nested registry `dist/` copy), with Next.js ESM aliases (`next/link.js`, `next/server.js`, `next/navigation.js`) so tests pass on Node 22+.
- **Node 22+ `localStorage`** — test setup strips Node’s broken experimental `localStorage` global so happy-dom passkey and client tests work.
- **Monorepo package resolution** — `apps/starter` and `apps/consumer-demo` depend on `file:../../packages/secure-auth` so `npm install` does not shadow the workspace package with a published tarball.

### Changed

- **`SECURE_AUTH_PACKAGE_VERSION`** — aligned with `packages/secure-auth/package.json` (`0.1.9-internal`).
- **Starter README** — troubleshooting entry for registry-copy and `localStorage` test failures.

## [0.1.8-internal] - 2026-06-15

### Changed

- Version bump to `0.1.8-internal` for npm republication after publish workflow updates.

## [0.1.7-internal] - 2026-06-15

### Added

- **MIT License** — root [LICENSE](LICENSE) file and [packages/secure-auth/LICENSE](packages/secure-auth/LICENSE) included in the published npm tarball.
- **Package metadata** — `@tgoliveira/secure-auth` `package.json` now declares `"license": "MIT"` (replaces `UNLICENSED` on npm).

## [0.1.6-internal] - 2026-06-15

### Added

- **GitHub Actions npm publish automation** — [`.github/workflows/publish-secure-auth.yml`](../.github/workflows/publish-secure-auth.yml) publishes `@tgoliveira/secure-auth` to the public npm registry when tags matching `secure-auth-v0.1.*-internal` are pushed.
- **npm Trusted Publishing (OIDC)** — workflow uses `id-token: write` and `actions/setup-node` with `registry-url`; no `NPM_TOKEN` secret or committed npm tokens.
- **[docs/publishing-npm-automation.md](docs/publishing-npm-automation.md)** — Trusted Publisher setup, release checklist, and consumer install notes.
- **Updated publishing docs** — [docs/publishing-private-package.md](docs/publishing-private-package.md) now points at public npm and automated releases.

## [0.1.5-internal] - 2026-06-15

### Fixed

- **Password policy override** — `AUTH_PASSWORD_MIN_LENGTH=5` (and other values below the previous env floor) now maps correctly in starter and consumer-demo apps. `resolvePasswordPolicyConfig()` merges partial `passwordPolicy` overrides with package defaults; `buildPublicUIConfig()` uses the resolved policy. `PasswordStrengthField`, reset-password, and change-password flows read policy from `SecureAuthUIProvider` instead of falling back to the default `minLength: 12`.

### Added

- **Tests** — env mapping for `AUTH_PASSWORD_MIN_LENGTH=5`, UI provider propagation, register API acceptance/rejection at configured min length, and `PasswordStrengthField` `minLength` / hint text.

## [0.1.4-internal] - 2026-06-11

### Added

- **Dual ESM + CommonJS builds** for all public package entrypoints (`.`, `./next`, `./react`, `./react/client`, `./email`, `./client`, `./client/password-policy`, `./drizzle/schema`) — ESM as `.js`, CommonJS as `.cjs`.
- **`require` export conditions** in `package.json` pointing to `.cjs` artifacts (e.g. `dist/drizzle/schema.cjs`).
- **Consumer entrypoint compatibility tests** — validates both `import()` and `require()` for every public subpath.
- **`apps/consumer-demo/src/lib/auth-schema.ts`** — re-exports `@tgoliveira/secure-auth/drizzle/schema` for drizzle-kit validation.

### Fixed

- **`ERR_PACKAGE_PATH_NOT_EXPORTED`** when consumers `require("@tgoliveira/secure-auth/drizzle/schema")` (drizzle-kit and other CJS toolchains).

## [0.1.3-internal] - 2026-06-11

### Added

- **`sessions.singleActiveSession`** — optional opt-in policy that revokes all other active sessions for a user after each successful login (email/password, passkey, OAuth, and post-2FA completion). Default remains multi-session.
- **`sessions.revocationPollIntervalSeconds`** — client poll interval (default **10s**, range 5–300) used when single active session is enabled so revoked browsers detect invalidation and sign out.
- **`SingleActiveSessionMonitor`** — client component (mounted by `SecureAuthUIProvider` when the policy is on) that polls `getSession()`, calls `signOut`, and hard-redirects to login when the server session no longer has a user; also checks on tab focus.
- **`SecureAuthUIPublicConfig.sessionPolicy`** — serializable `{ singleActiveSession, revocationPollIntervalSeconds }` for `SessionProvider refetchInterval` and the monitor.
- **App-level env → config mapping** — `buildSecureAuthConfigFromEnv()` and parsing helpers (`readBooleanEnv`, `readNumberEnv`, `readEnumEnv`, …) in `apps/starter` and `apps/consumer-demo`; maps `AUTH_*` variables into `createSecureAuth(config)` without package `process.env` reads.
- **[docs/configuration-reference.md](docs/configuration-reference.md)** — canonical env variable and TypeScript config reference (defaults, allowed values, unsupported options).
- **Env templates** — root [`.env.example`](.env.example), [`apps/starter/.env.example`](apps/starter/.env.example), and updated [`apps/consumer-demo/.env.example`](apps/consumer-demo/.env.example) with grouped sections and comments.
- **Env variables** (app boundary): `AUTH_SINGLE_ACTIVE_SESSION`, `AUTH_SESSION_REVOCATION_POLL_SECONDS`, `AUTH_PASSWORD_STRENGTH_POSITION`, `AUTH_PASSWORD_*`, `AUTH_SESSION_*`, `AUTH_COOKIE_SECURE`, `AUTH_TRACE`, OAuth `AUTH_*` names (with legacy aliases), and related app/base URL vars — see configuration reference.
- **Tests** — env parsing and mapping (`secure-auth-from-env`, `env-parse`), single active session service/auth-options, `SingleActiveSessionMonitor`, and `sessionPolicy` in `buildPublicUIConfig`.
- **Audit event** — `sessions_revoked_on_login` when other sessions are revoked on login.
- **`ui.passwordStrength.position`** — global package UI setting for password strength / validation feedback placement (`"above"` default, `"below"` for legacy behavior). Flows through `secureAuth.uiConfig` → `SecureAuthUIProvider` → `PasswordStrengthField` and all password forms.
- **`passwordStrengthPosition` page prop** — per-page override on `RegisterPage`, `ResetPasswordPage`, `AccountSettingsPage`, and `ChangePasswordSettings` (precedence: prop → provider → default).
- **`PasswordFieldFeedbackPlacement`** — shared helper for consistent feedback ordering and spacing.
- **Starter home documentation links** — GitHub doc links section on the unauthenticated home page.
- **`apps/consumer-demo`** — canonical minimal downstream consumer validation app (public exports only).

### Changed

- **`apps/starter` and `apps/consumer-demo`** — `secure-auth.ts` uses `buildSecureAuthConfigFromEnv()`; `SessionProvider` sets `refetchInterval` from `uiConfig.sessionPolicy` when single active session is enabled.
- **Documentation** — README, starter/consumer READMEs, package README, `customization`, `package-api`, `security`, and `consumer-quick-start` link to [configuration-reference.md](docs/configuration-reference.md) instead of duplicating large config tables.
- Password strength / validation feedback now renders **above** the relevant password field by default everywhere it appears in package UI.
- Password feedback uses a **stable reserved region** — neutral requirements show before typing; strength updates in place without remounting the input or stealing focus.
- Single active session: revoked browsers **sign out locally** (not only end the DB session) within the configured poll interval or immediately when refocusing a revoked tab.

### Release

- **npm publication preparation** — package version `0.1.3-internal`; `publishConfig.access: public` for manual publish to the public npm registry (publish not executed in CI).

## [0.1.2-internal] - 2026-06-11

### Added

- **`SecureAuthUIProvider`** — client context for page defaults from `createSecureAuth(config).uiConfig`.
- **`buildPublicUIConfig`** — serializable `SecureAuthUIPublicConfig` (paths, messages, password policy; no secrets).
- **Constructor-based DI** — services receive `config` and `db` via factories; global runtime state removed.
- **Ready-to-use page components** — `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `CheckEmailPage`, `VerifyEmailPage`, `LoginTwoFactorPage`, `LoginCompletePage`, `AccountSettingsPage`, `SecuritySettingsPage`, `SessionsSettingsPage`, `AccountDeletedPage`, optional `DashboardPlaceholderPage` exported from `@tgoliveira/secure-auth/react`.
- **UI feature blocks** — auth/settings feature components for optional composition.
- **Client helpers** — `defaultSignOutAccount`, `signInWithPasskey`, `buildPasskeyLoginOptionsPayload` on `@tgoliveira/secure-auth/react/client`.
- **Package tests** — page export, render smoke, UI provider, and client/server boundary tests.

### Changed

- **`apps/starter`** — auth/account/security routes are thin wrappers; layout passes `secureAuth.uiConfig` to `SecureAuthUIProvider`.
- **Documentation** — package-first architecture cleanup; obsolete phase logs and starter-first docs removed; consolidated security and architecture docs under `docs/`.
- **`@tgoliveira/secure-auth/react`** — documents `SecureAuthUIProvider`, `uiConfig`, and path helpers.

### Removed

- Global runtime state (`initSecureAuthRuntime`, `getSecureAuthConfig`, `getSecureAuthDb`).
- Obsolete documentation: root `ARCHITECTURE.md`, `SECURITY.md`, phase logs, migration history docs (see [documentation-audit.md](docs/documentation-audit.md)).

## [0.1.1-internal] - 2026-06-11

### Added

- **Package hardening phase** — documented in CHANGELOG and [docs/security.md](docs/security.md).
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
- Public exports: `createAuthServices`, `createRoutes`, `@tgoliveira/secure-auth/server` entry path.

### Fixed

- Cookie setter bug in credentials login form handlers (`getLoginPendingTokenCookieName()` call).
- Route test mocks targeting removed `@/lib/auth/session` path.

### Package-readiness (same release)

- **`next-auth` peer dependency** — declared in `peerDependencies` and `devDependencies` (`^4.24.11`).
- **`SECURE_AUTH_PACKAGE_VERSION`** — centralized constant; health route reports `0.1.1-internal`.
- **Public API narrowed** — `createAuthServices` and `createRoutes` no longer exported; `@tgoliveira/secure-auth/server` export path removed.
- **Sourcemaps** — build omits `sourcesContent` from generated `.map` files.
- **Runtime documentation** — scoped runtime state documented as temporary 0.1.x limitation; 0.2.x constructor DI target.

### Consumer onboarding documentation

- [docs/consumer-quick-start.md](docs/consumer-quick-start.md)
- [docs/minimal-consumer-example.md](docs/minimal-consumer-example.md)
- [docs/consumer-validation-checklist.md](docs/consumer-validation-checklist.md)
- Updated [docs/package-api.md](docs/package-api.md) with supported / unsupported entry points

## [0.1.0-internal] - 2026-06-11

### Added

- **Monorepo layout** — `packages/secure-auth` (`@tgoliveira/secure-auth`) + `apps/starter` integration harness.
- **`createSecureAuth(config)`** — single factory for auth domain wiring (db, email, OAuth, WebAuthn, UI).
- **Public package exports** — `/next`, `/react`, `/react/client`, `/client`, `/drizzle/schema`, `/email` (historical; `/server` was removed in `0.1.1-internal`).
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
- **npm audit** — 11 transitive vulnerabilities (documented in [docs/security.md](docs/security.md)).
- **OAuth E2E** — policy unit tests; manual provider validation required for CI gaps.

[0.1.18-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.18-internal
[0.1.17-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.17-internal
[0.1.16-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.16-internal
[0.1.15-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.15-internal
[0.1.14-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.14-internal
[0.1.13-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.13-internal
[0.1.12-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.12-internal
[0.1.11-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.11-internal
[0.1.10-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.10-internal
[0.1.9-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.9-internal
[0.1.8-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.8-internal
[0.1.7-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.7-internal
[0.1.6-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.6-internal
[0.1.5-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.5-internal
[0.1.4-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.4-internal
[0.1.3-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.3-internal
[0.1.2-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.2-internal
[0.1.1-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/secure-auth-v0.1.1-internal
[0.1.0-internal]: https://github.com/tgoliveira11/next-secure-auth-starter/releases/tag/v0.1.0-internal
