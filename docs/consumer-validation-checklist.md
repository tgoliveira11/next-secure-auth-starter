# Consumer validation checklist

Use this when integrating `@tgoliveira/secure-auth@0.1.7-internal` into a **new** consumer application.

**Canonical in-repo example:** [apps/consumer-demo](../apps/consumer-demo) — run `npm run dev:consumer` after setup.

Reference: [consumer-quick-start.md](./consumer-quick-start.md) · [consumer-demo-validation.md](./consumer-demo-validation.md)

---

## Installation

- [ ] `@tgoliveira/secure-auth@0.1.7-internal` installed from registry
- [ ] Peer dependencies installed: `next`, `next-auth`, `react`, `react-dom`, `drizzle-orm`
- [ ] PostgreSQL driver installed (`postgres` or equivalent)
- [ ] `.npmrc` configured for GitHub Packages (if private registry)

---

## Database

- [ ] `DATABASE_URL` set
- [ ] Drizzle client uses `authSchema` from `@tgoliveira/secure-auth/drizzle/schema`
- [ ] Migrations applied (`drizzle-kit migrate` against package `migrations/`)
- [ ] No duplicated auth table definitions in app schema

---

## Composition root

- [ ] Single `createSecureAuth(config)` call in `src/lib/secure-auth.ts` (or equivalent)
- [ ] Config maps app env vars → `SecureAuthConfig` (package does not read `process.env`)
- [ ] `nextAuthSecret` and `twoFactorEncryptionKey` provided in config
- [ ] No imports from `@tgoliveira/secure-auth/server`
- [ ] No calls to `createRoutes`, `createAuthServices`, or internal runtime helpers

---

## Routes
- [ ] `EmailProvider` implemented in app code
- [ ] Provider wired via `createSecureAuth({ email: { from, provider } })`
- [ ] Verification email received (console, Mailpit, or SMTP)

---

## OAuth

- [ ] Optional providers configured in `createSecureAuth({ oauth: { ... } })`
- [ ] `src/app/api/auth/[...nextauth]/route.ts` uses `createNextAuthRouteHandlers`
- [ ] Provider redirect URIs match `{APP_BASE_URL}/api/auth/callback/{provider}`
- [ ] Social sign-in completes and creates session

---

## Passkeys

- [ ] `webauthn.rpId`, `webauthn.origin`, `webauthn.rpName` configured
- [ ] `WEBAUTHN_ORIGIN` matches browser URL exactly
- [ ] Passkey login/register routes wired (`secureAuth.routes.passkeyLoginOptions`, etc.)
- [ ] Passkey sign-in works in supported browser

---

## 2FA

- [ ] `twoFactorEncryptionKey` set in `createSecureAuth` config
- [ ] 2FA setup routes wired (`secureAuth.routes.twoFactorSetupStart`, etc.)
- [ ] TOTP setup and login-with-2FA flow verified

---

## Routes
- [ ] Auth routes use `secureAuth.routes.*` (thin `route.ts` wrappers)
- [ ] Account routes use `secureAuth.routes.*`
- [ ] Health route returns `version: "0.1.7-internal"`

---

## Styles & UI

- [ ] `@import "@tgoliveira/secure-auth/styles.css"` in app global CSS
- [ ] Theme CSS variables defined (`:root { --primary, --card, ... }`)
- [ ] `SecureAuthUIProvider` wraps app with `secureAuth.uiConfig`
- [ ] UI defaults configured in `createSecureAuth({ ui: { paths, messages } })`
- [ ] Package UI components render with expected styling
- [ ] Auth/account routes use package page components as thin wrappers
- [ ] Pages customized via provider config or per-page props where needed

---

## Build & runtime

- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] Application starts (`npm run dev` / `npm start`)
- [ ] Register → verify email → sign in → dashboard flow works

---

## Public API compliance

- [ ] Imports use only [supported entry points](./package-api.md#supported-public-entry-points)
- [ ] No deep imports into package `src/`
- [ ] No obsolete APIs (`createRouteHandlers`, `@tgoliveira/secure-auth/server`)

---

## Sign-off

| Field | Value |
| --- | --- |
| Consumer app name | |
| Package version | `0.1.7-internal` |
| Validated by | |
| Date | |
