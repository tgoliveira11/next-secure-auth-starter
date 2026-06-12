# Architecture (legacy)

> **Superseded by [docs/architecture.md](docs/architecture.md)** — this file describes the pre-monorepo standalone starter. The current layout uses `packages/secure-auth` + `apps/starter`.

## Architecture style

`next-secure-auth-starter` uses a **modular monolith** architecture.

It is a single deployable Next.js application, organized into clear internal modules.

It is not a monorepo and does not publish external packages in the initial version.

## Target module structure

```text
src/
  app/                  # Next.js App Router — thin route handlers only
  modules/
    auth/               # Login, OAuth, passkey auth, auth policy
    account/            # Settings, verification, password flows, deletion
    sessions/           # Active sessions, revocation, metadata
    two-factor/         # TOTP setup, verify, disable
    passkeys/           # WebAuthn registration and login
    email/              # Provider abstraction, templates
    audit/              # Event definitions, persistence, sanitization
    rate-limit/         # Policies and adapters
    security/           # Hashing, tokens, logging, redaction, env validation
    ui/                 # Reusable, domain-neutral UI primitives
```

## Module responsibilities

### auth

Email/password login, OAuth login (Google, Apple, Microsoft), passkey login, Auth.js callbacks, authentication policy, and login rate limits.

### account

Account settings, email verification, forgot/reset password, change password, account deletion, and account auth status.

### sessions

Account sessions, active session listing, session revocation, revoke-all-other-sessions, session metadata, IP masking/hash, and user-agent parsing.

### two-factor

TOTP setup, verification, disable flow, backup codes (if implemented), and password-login 2FA challenge.

### passkeys

WebAuthn registration, passkey account login, challenge creation, atomic challenge consumption, passkey removal, and passkey metadata.

Passkeys in this starter are **account authentication only**. Do not use WebAuthn PRF or signatures as encryption keys.

### email

Email provider abstraction, console provider, SMTP provider, Mailpit development support, verification email templates, and password reset email templates.

### audit

Audit event definitions, audit persistence, audit sanitization, and safe metadata rules.

### rate-limit

Rate limit interface, in-memory adapter (development), PostgreSQL adapter (production), and operation-specific policies.

### security

Safe logger, redaction, token hashing, secure token generation, password policy, IP masking/hash, user-agent parsing, and environment validation.

### ui

Reusable, domain-neutral UI primitives for account and security flows. Mobile-first.

## Next.js route model

Next.js route files remain under `src/app`.

Route files should be **thin**. They should:

1. parse the request;
2. call module handlers or services;
3. return the response.

Business logic must live inside modules, not directly inside route files.

Prefer Route Handlers (`route.ts`) or server-side module calls from Server Components for sensitive operations. Avoid Server Actions for sensitive account operations unless explicitly reviewed.

## Auth.js integration

Auth.js/NextAuth is the session and provider orchestration layer.

- Provider configuration lives in the `auth` module.
- Session strategy, callbacks, and token handling must align with [SECURITY.md](SECURITY.md).
- OAuth providers are account authentication only — minimal scopes, no unnecessary token persistence.
- Custom credentials, passkey, and TOTP flows integrate through Auth.js where appropriate, with module-specific logic kept in bounded modules.

## Database

The starter uses PostgreSQL with Drizzle ORM.

- Migrations must be explicit, reviewed, and tested.
- Schema changes require corresponding test and documentation updates.
- Sensitive columns (password hashes, token hashes, TOTP secrets) must follow [SECURITY.md](SECURITY.md).

## Server/client separation

| Layer | May import |
| --- | --- |
| Client components | Client-safe module APIs, `ui` primitives |
| Server components / route handlers | Full module APIs |
| Modules (server) | Other modules per [docs/MODULE_BOUNDARIES.md](docs/MODULE_BOUNDARIES.md) |

Client components must **never** import database clients, repositories, or server-only secrets.

## API-first boundary

UI components must not import database clients or repositories directly.

Client-side UI should call Route Handlers or client-safe module functions.

## Request flow (target)

```text
Browser
  → Next.js route (src/app)
    → module service (src/modules/*)
      → repository / Drizzle
      → audit / rate-limit / email (as needed)
    ← typed response
  ← HTTP response / RSC payload
```

## Environment configuration

Environment variables will be documented in `.env.example` once Phase 1 begins.

Expected areas:

- app URL and Auth.js secret
- database URL
- email provider (console / SMTP / Mailpit)
- OAuth client credentials (Google, Apple, Microsoft)
- TOTP secret encryption key
- password policy mode
- session and rate-limit configuration

Changes to environment variables require README and `.env.example` updates in the same change.
