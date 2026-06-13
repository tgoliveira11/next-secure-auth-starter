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
- Environment variables (`.env.example`)

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

## Prop override test

`/login` intentionally passes `title="Prop override: custom sign-in title"` to `LoginPage`, overriding `ui.messages.loginTitle` from `SecureAuthUIProvider`. This validates **prop → provider → default** precedence.

## Health check

```bash
curl http://localhost:3002/api/auth/package-health
```

## See also

- [docs/consumer-demo-validation.md](../../docs/consumer-demo-validation.md)
- [docs/consumer-quick-start.md](../../docs/consumer-quick-start.md)
