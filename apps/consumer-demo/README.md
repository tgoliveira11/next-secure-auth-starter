# Consumer Demo

Canonical in-repo validation app for [`@tgoliveira/secure-auth`](../../packages/secure-auth).

This app proves a **brand-new Next.js consumer** can adopt the package using **public exports only** — no `apps/starter` code, no `packages/secure-auth/src` imports, no runtime helpers.

## What this app owns

- PostgreSQL connection (`src/lib/db.ts`)
- Console `EmailProvider` (`src/lib/email-provider.ts`)
- `createSecureAuth(config)` (`src/lib/secure-auth.ts`)
- `SecureAuthUIProvider` + `SessionProvider` (`src/components/providers.tsx`)
- Thin page wrappers (`src/app/**/page.tsx`)
- Thin API route wrappers (`src/app/api/**/route.ts`)
- Environment variables ([`.env.example`](./.env.example) — see [docs/configuration-reference.md](../../docs/configuration-reference.md); includes optional `AUTH_CAPTCHA_*` Turnstile settings, disabled by default)

## What the package owns

- Auth logic, policies, and route handlers
- Ready-to-use pages (`LoginPage`, `RegisterPage`, …)
- UI defaults via `secureAuth.uiConfig`
- Schema and migrations (`@tgoliveira/secure-auth/drizzle/schema`)

## Quick start

```bash
cp .env.example .env.local
# Set NEXTAUTH_SECRET and TWO_FACTOR_SECRET_ENCRYPTION_KEY

npm install
npm run db:migrate -w @secure-auth/consumer-demo
npm run dev -w @secure-auth/consumer-demo
```

Open http://localhost:3002

## Prop override tests

- **`/login`** — passes `title="Prop override: custom sign-in title"` to `LoginPage`, overriding `ui.messages.loginTitle` from `SecureAuthUIProvider`. Validates **prop → provider → default** precedence for page copy.
- **`/reset-password`** — passes `passwordStrengthPosition="below"` to `ResetPasswordPage`, overriding the package default (`above`) for password feedback placement only on that page.

## Password policy override

Default minimum password length is **12** (`AUTH_PASSWORD_MIN_LENGTH=12` in `.env.example`). Set `AUTH_PASSWORD_MIN_LENGTH=5` in `.env.local` to verify env → `createSecureAuth({ passwordPolicy: { minLength: 5 } })` → UI and validation. Automated coverage: `src/test/secure-auth-from-env.test.ts`.

## Optional session policy

Set `AUTH_SINGLE_ACTIVE_SESSION=true` in `.env.local` (mapped to `sessions.singleActiveSession` in `src/lib/env/secure-auth-from-env.ts`). Default is multi-session. See [docs/configuration-reference.md](../../docs/configuration-reference.md).

## Optional OAuth (GitHub)

Map `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET` in `.env.local` (see [`.env.example`](./.env.example)). The GitHub sign-in button appears only when both values are set. Callback URL for local dev: `http://localhost:3002/api/auth/callback/github`. GitHub OAuth Apps allow one callback URL per app — use separate apps for local/staging/production. See [docs/configuration-reference.md](../../docs/configuration-reference.md).

## Health check

```bash
curl http://localhost:3002/api/auth/package-health
```

## See also

- [docs/configuration-reference.md](../../docs/configuration-reference.md)
- [docs/consumer-demo-validation.md](../../docs/consumer-demo-validation.md)
- [docs/consumer-quick-start.md](../../docs/consumer-quick-start.md)
