# @tgoliveira/secure-auth

**Version:** `0.1.0-internal` (experimental — not production-ready)

Opinionated authentication package for **Next.js App Router**, **TypeScript**, **Drizzle ORM**, and **PostgreSQL**. Designed for **private/internal** consumption first (GitHub Packages).

This is **not** a generic auth framework. It encodes specific flows: credentials + OAuth, email verification, password reset, TOTP 2FA, passkeys, sessions, and audit logging.

## Public imports

| Import | Purpose |
| --- | --- |
| `@tgoliveira/secure-auth` | Core types, `createAuthServices`, schema re-exports |
| `@tgoliveira/secure-auth/next` | `createSecureAuth(config)` — main entry point |
| `@tgoliveira/secure-auth/react` | Default UI primitives (server-safe components) |
| `@tgoliveira/secure-auth/react/client` | Client-only UI (`ConfirmDialog`, hooks) |
| `@tgoliveira/secure-auth/client` | Browser-safe API client, passkey helpers, OAuth UI constants, formatters |
| `@tgoliveira/secure-auth/client/password-policy` | Password policy config (safe for server components) |
| `@tgoliveira/secure-auth/server` | Server helpers (`createRouteHandlers`, `createAuthServices`) |
| `@tgoliveira/secure-auth/drizzle/schema` | Auth Drizzle schema (single source of truth) |
| `@tgoliveira/secure-auth/email` | Email provider types |
| `@tgoliveira/secure-auth/styles.css` | Tailwind v4 `@source` registration for package UI classes (import from app `globals.css`) |

The root export also exposes `safeLogger` for app-owned adapters (e.g. SMTP delivery in the starter).

Deep imports into `packages/secure-auth/src/**` are **not supported**.

## Quick start

```typescript
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import type { EmailProvider } from "@tgoliveira/secure-auth/email";
import { db } from "@/lib/db";

const emailProvider: EmailProvider = {
  async send({ to, subject, html, text }) {
    // app-owned delivery (SMTP, console, etc.)
  },
};

export const secureAuth = createSecureAuth({
  db,
  app: { name: "My App", slug: "my-app", baseUrl: process.env.APP_BASE_URL! },
  auth: {
    afterLoginPath: "/dashboard",
    afterLogoutPath: "/login",
    requireEmailVerificationBeforeSignIn: false,
    nextAuthSecret: process.env.NEXTAUTH_SECRET!,
    twoFactorEncryptionKey: process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY!,
  },
  email: { from: "My App <noreply@example.com>", provider: emailProvider },
  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID!,
    rpName: "My App",
    origin: process.env.WEBAUTHN_ORIGIN!,
  },
  ui: {
    brand: { name: "My App" },
    paths: { login: "/login", register: "/register", account: "/account", security: "/account/security" },
  },
});
```

## Route handlers

Expose thin App Router wrappers in the consuming app:

```typescript
// app/api/auth/login/start/route.ts
export async function POST(request: Request) {
  const { secureAuth } = await import("@/lib/secure-auth");
  return secureAuth.routes.loginStart.POST(request);
}
```

All auth/account API route handlers are available on `secureAuth.routes.*` (Phase 7). The starter app wraps them in thin `app/api/**/route.ts` files.

## Tailwind CSS (v4)

UI primitives use Tailwind utility classes. Tailwind v4 only auto-scans the consuming app — register package sources in the app stylesheet:

```css
@import "tailwindcss";
@import "@tgoliveira/secure-auth/styles.css";
```

Copy the CSS variables from `apps/starter/src/app/globals.css` (`:root { --primary, --card, … }`) or define your own theme tokens. The package components reference those variables.

## EmailProvider contract

The package sends account email (verification, password reset) only through the injected provider:

```typescript
import type { EmailProvider } from "@tgoliveira/secure-auth/email";

export const emailProvider: EmailProvider = {
  async send({ to, subject, html, text }) {
    await myTransport.send({ from: process.env.EMAIL_FROM!, to, subject, html, text });
  },
};
```

The package includes default **templates** (`verificationEmailContent`, `passwordResetEmailContent`) using `config.app.baseUrl` and `config.app.name`. Transport (SMTP, Resend, SES, console) belongs in the consuming app.

Reference implementation: `apps/starter/src/modules/email/core/` wired in `apps/starter/src/lib/secure-auth.ts`.

## Dependency injection

Call `createSecureAuth(config)` once at app startup. This binds `{ config, db }` into a single runtime used by services and repositories. Services do not read `process.env` directly.

## Database and migrations

- Schema: `@tgoliveira/secure-auth/drizzle/schema`
- SQL migrations: `packages/secure-auth/migrations/`
- The **app owns** the `DATABASE_URL` connection; the **package owns** auth tables.

See [docs/migrations.md](../../docs/migrations.md).

## UI customization

Pass `ui` config to `createSecureAuth`:

- `brand.name`, optional `brand.logo`
- `paths` (login, register, account, security)
- `messages` — string overrides
- `cssVariables` — design tokens
- Optional email templates via `email.templates`

Import default components from `@tgoliveira/secure-auth/react`.

## Versioning

| Range | Meaning |
| --- | --- |
| `0.1.x` | Experimental internal package |
| `0.2.x` | Migrations / DB contract still unstable |
| `0.5.x` | API reasonably stable |
| `1.0.0` | Production-ready public contract |

## Security

See [docs/security-hardening.md](../../docs/security-hardening.md). Do not treat `0.1.x` as production-ready.
