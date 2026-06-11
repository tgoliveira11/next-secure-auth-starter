# Extraction notes

This document records how **`next-secure-auth-starter`** was derived from the **`letters-to-god`** codebase and what was intentionally kept, removed, or rewritten.

## 1. Origin

The repository began as a full copy of the `letters-to-god` application tree. The extraction goal was to produce a **generic secure account/authentication starter** with no product domain (private letters, vault unlock, spiritual copy, or community features).

## 2. Intentionally removed

### Routes and APIs

- `/letters`, `/letters/new`, `/letters/[id]`
- `/vault`, `/vault/unlock`, `/vault/recovery`, `/vault/devices`
- `/api/letters`, `/api/vault`
- Trusted-device, recovery-code, and passkey vault-unlock API routes

### Modules and features

- `src/modules/letters`, `src/modules/vault`
- `src/features/letters`, `src/features/vault`, `src/features/recovery`
- `src/lib/crypto-client/**` (client-side vault/letter cryptography)
- Letter/vault server shims under `src/server/services/*` and `src/server/repositories/*`

### Database

Removed tables and columns related to the original product:

- `letters`
- `user_vaults`
- `vault_envelopes`
- `trusted_devices` (vault unlock)
- Passkey columns for PRF vault unlock (`vaultUnlockEnabled`, `prfSupported`)

### Dependencies

- `hash-wasm`, `idb` (vault/letter client crypto and IndexedDB storage)

### Tests

Removed or replaced tests covering vault unlock, letter encryption, recovery codes, trusted devices, and PRF passkey envelopes.

## 3. Retained

Reusable account/auth/security infrastructure:

- Email/password authentication
- Google, Apple, and Microsoft OAuth
- Passkeys for **account sign-in only**
- Optional TOTP two-factor authentication
- Email verification, forgot/reset password, change password
- Account deletion
- Active account sessions and revocation
- Audit logs and rate limiting
- Email provider abstraction (console/SMTP/Mailpit)
- Safe logger/redaction, password policy, token hashing, IP masking
- PostgreSQL schema via Drizzle
- Mobile-first account/security UI and generic UI primitives
- Security docs, Cursor rules, and boundary/guard tests

## 4. Rewritten

- **Branding**: `Letters to God` → `Next Secure Auth Starter` (`src/lib/brand.ts`, layout, emails, WebAuthn RP name).
- **Post-login destination**: `/dashboard` instead of product routes.
- **Settings layout**: account (`/settings/account`), sessions (`/settings/sessions`), security (`/settings/security`).
- **Passkey services**: account authentication only; PRF vault envelope logic removed.
- **Schema**: account-only tables; clean baseline migration in `drizzle/0000_optimal_warpath.sql`.
- **Navigation**: Dashboard, Account, Sessions, Security, Sign out.
- **Documentation**: README, ARCHITECTURE, SECURITY, module boundaries, and usage guides updated for the starter scope.

## 5. Remaining risks and gaps

- **Fresh migration baseline**: New projects should run `npm run db:migrate` against an empty database. There is no migration path from legacy `letters-to-god` vault/letter tables.
- **OAuth env naming**: Google/Apple use `GOOGLE_*` / `APPLE_*` in `auth-options.ts`; Microsoft accepts `AUTH_MICROSOFT_*` aliases. See `.env.example`.
- **E2E coverage**: Playwright tests exist but are optional; local E2E may require Docker services.
- **Human security review**: Any future change to auth boundaries should follow `AGENTS.md` and mark `TODO_SECURITY_REVIEW_REQUIRED` when design is unclear.

## 6. How to validate the starter

Run from the repository root:

```bash
docker compose up -d          # PostgreSQL (host port 5433) + Mailpit
cp .env.example .env.local    # configure secrets
npm ci
npm run db:migrate            # when PostgreSQL is available
```

**Local port note:** Docker Postgres is published on **host port 5433** (not 5432) so it does not collide with another PostgreSQL already running on your machine. Ensure `DATABASE_URL` uses `localhost:5433`. Mailpit UI is on http://localhost:8026 when ports 8025 is taken.

```bash
npm run lint
npm run test
npm run test:coverage
npm run build
```

Static guard tests in `src/test/security/product-exclusion-guard.test.ts` fail if vault/letters paths or product strings reappear under application source.

Confirm manually:

- No `/letters` or `/vault` routes in the app router
- Passkey settings describe sign-in only (no vault unlock)
- Dashboard and settings pages use generic account copy

## 7. PostgreSQL validation note

Migrations are generated from `src/lib/db/schema.ts` via Drizzle Kit. Whether migrations were executed against a live PostgreSQL instance depends on the environment where validation was run; see the final cleanup report for that session.
