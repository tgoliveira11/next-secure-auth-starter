# Consumer quick start

**Package:** `@tgoliveira/secure-auth@0.1.4-internal`  
**Audience:** Engineers integrating the package into a **brand-new** Next.js App Router application.

This guide is self-contained. You do not need to read package source code.

**Related docs:**

- [minimal-consumer-example.md](./minimal-consumer-example.md) — smallest working integration
- [apps/consumer-demo](../apps/consumer-demo) — canonical in-repo validation app
- [consumer-demo-validation.md](./consumer-demo-validation.md) — validation report
- [package-api.md](./package-api.md) — supported public entry points
- [consumer-validation-checklist.md](./consumer-validation-checklist.md) — verify your integration
- [publishing-private-package.md](./publishing-private-package.md) — registry install

---

## Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 20+ |
| npm | 10+ |
| PostgreSQL | 14+ (16 recommended) |
| Next.js | 16+ (App Router) |

---

## 1. Install the package

Configure GitHub Packages (private registry):

```ini
# .npmrc (do not commit tokens)
@tgoliveira:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

```bash
export GITHUB_PACKAGES_TOKEN=ghp_...
npm install @tgoliveira/secure-auth@0.1.4-internal
```

---

## 2. Install peer dependencies

The package **requires** these peers in your application. Install them explicitly:

```bash
npm install next@^16 react@^19 react-dom@^19 next-auth@^4.24.11 drizzle-orm@^0.44.2 postgres
```

Also install dev tooling you will need:

```bash
npm install -D drizzle-kit typescript @types/node @types/react @types/react-dom
```

| Peer | Why |
| --- | --- |
| `next` | App Router route handlers, server components |
| `next-auth` | OAuth session provider (`createNextAuthRouteHandlers`) |
| `react` / `react-dom` | UI primitives from `@tgoliveira/secure-auth/react` |
| `drizzle-orm` | Database client typing with package schema |
| `postgres` | PostgreSQL driver (consumer-owned; not a package peer but required) |

---

## 3. Configure the database

Create `src/lib/db/index.ts`:

```typescript
import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { authSchema, type AuthSchema } from "@tgoliveira/secure-auth/drizzle/schema";

export type DbClient = PostgresJsDatabase<AuthSchema>;

const client = postgres(process.env.DATABASE_URL!, { max: 10 });
export const db = drizzle(client, { schema: authSchema });
```

Set `DATABASE_URL` in `.env.local`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/my_app
```

---

## 4. Import schema

Import `authSchema` and table types from the public export only:

```typescript
import { authSchema, users, type AuthSchema, type User } from "@tgoliveira/secure-auth/drizzle/schema";
```

Do **not** duplicate auth table definitions. The package owns the schema.

If your app has its own tables, merge schemas in the Drizzle client:

```typescript
import { authSchema } from "@tgoliveira/secure-auth/drizzle/schema";
import * as appSchema from "./app-schema";

const schema = { ...authSchema, ...appSchema };
export const db = drizzle(client, { schema });
```

---

## 5. Run migrations

The package ships SQL migrations in `node_modules/@tgoliveira/secure-auth/migrations/`.

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "node_modules/@tgoliveira/secure-auth"
);

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schema: path.join(packageRoot, "dist/drizzle/schema.js"),
  out: path.join(packageRoot, "migrations"),
});
```

Add to `package.json`:

```json
{
  "scripts": {
    "db:migrate": "drizzle-kit migrate"
  }
}
```

Apply migrations:

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/my_app
npm run db:migrate
```

See [migrations.md](./migrations.md) for monorepo vs downstream details.

---

## 6. Create the `secureAuth` instance

**`createSecureAuth(config)` is the only supported composition root.** Create one instance in `src/lib/secure-auth.ts`.

In-repo apps use `buildSecureAuthConfigFromEnv()` (`apps/starter/src/lib/env/`, `apps/consumer-demo/src/lib/env/`) to map `.env` values into config — see [configuration-reference.md](./configuration-reference.md). You may inline `process.env` reads in your app or use a similar helper; the package must receive typed config only.

```typescript
import "server-only";
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import type { EmailProvider } from "@tgoliveira/secure-auth/email";
import { db } from "@/lib/db";

const emailProvider: EmailProvider = {
  async send({ to, subject, html, text }) {
    // Your transport — see section 7
  },
};

export const secureAuth = createSecureAuth({
  db,
  app: {
    name: process.env.APP_NAME ?? "My App",
    slug: process.env.APP_SLUG ?? "my-app",
    baseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  },
  auth: {
    afterLoginPath: "/dashboard",
    afterLogoutPath: "/login",
    requireEmailVerificationBeforeSignIn: false,
    nextAuthSecret: process.env.NEXTAUTH_SECRET!,
    twoFactorEncryptionKey: process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY!,
  },
  email: {
    from: process.env.EMAIL_FROM ?? "My App <noreply@example.com>",
    provider: emailProvider,
  },
  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID ?? "localhost",
    rpName: process.env.APP_NAME ?? "My App",
    origin: process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000",
  },
  server: {
    cookieSecure: process.env.NODE_ENV === "production",
  },
});
```

Import this module from every API route file (directly or transitively) so the runtime is initialized before handlers run.

---

## 7. Configure EmailProvider

The package sends verification and password-reset email **only** through your injected provider:

```typescript
import type { EmailProvider } from "@tgoliveira/secure-auth/email";

export const emailProvider: EmailProvider = {
  async send({ to, subject, html, text }) {
    await mySmtpTransport.send({ to, subject, html, text });
  },
};
```

Wire it in `createSecureAuth({ email: { from, provider: emailProvider } })`.

For local development, log links to the console or use Mailpit SMTP. Reference: `apps/starter/src/modules/email/core/` in this monorepo.

---

## 8. Configure OAuth providers

Pass optional OAuth credentials in `createSecureAuth`:

```typescript
oauth: {
  google: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined,
  apple: process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    ? { clientId: process.env.APPLE_CLIENT_ID, clientSecret: process.env.APPLE_CLIENT_SECRET }
    : undefined,
  microsoft: process.env.AUTH_MICROSOFT_ID && process.env.AUTH_MICROSOFT_SECRET
    ? {
        clientId: process.env.AUTH_MICROSOFT_ID,
        clientSecret: process.env.AUTH_MICROSOFT_SECRET,
        tenantId: process.env.AUTH_MICROSOFT_TENANT_ID ?? "common",
      }
    : undefined,
},
```

Mount NextAuth in your app (app-owned route):

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import "@/lib/secure-auth";
import NextAuth from "next-auth";
import { createNextAuthRouteHandlers } from "@tgoliveira/secure-auth/next";

export const { GET, POST } = createNextAuthRouteHandlers(NextAuth, secureAuth.getServices);
```

Register redirect URIs with each provider:

```text
{APP_BASE_URL}/api/auth/callback/google
{APP_BASE_URL}/api/auth/callback/apple
{APP_BASE_URL}/api/auth/callback/azure-ad
```

---

## 9. Configure passkeys

Passkeys are configured via `webauthn` in `createSecureAuth`:

```typescript
webauthn: {
  rpId: process.env.WEBAUTHN_RP_ID ?? "localhost",
  rpName: "My App",
  origin: process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000",
},
```

| Variable | Rule |
| --- | --- |
| `WEBAUTHN_RP_ID` | Hostname only (`localhost` in dev — not `127.0.0.1`) |
| `WEBAUTHN_ORIGIN` | Full origin including scheme and port; must match the browser URL exactly |

Expose passkey API routes via `secureAuth.routes`:

```typescript
// src/app/api/auth/passkey/login/options/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.passkeyLoginOptions.POST;
```

Use `@tgoliveira/secure-auth/client` helpers in login UI (`passkeyLoginApi`, `prepareAuthenticationOptions`).

---

## 10. Configure 2FA

TOTP 2FA requires the encryption key in `createSecureAuth` config (not a separate env read by the package):

```typescript
auth: {
  // ...
  twoFactorEncryptionKey: process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY!,
},
```

Generate a 32-byte key (example):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Users enable 2FA in your settings UI. Wire account 2FA routes:

```typescript
// src/app/api/account/2fa/setup/start/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.twoFactorSetupStart.POST;
```

Use `@tgoliveira/secure-auth/client` (`twoFactorApi`) in settings components.

### Session policy (optional)

By default users may stay signed in on multiple browsers/devices at once.

To enforce **single active session** (each login revokes other sessions for that user):

```typescript
export const secureAuth = createSecureAuth({
  // ...
  sessions: {
    singleActiveSession: true,
  },
});
```

The current session is preserved; other devices lose access on their next request. Applies after successful email/password, passkey, OAuth, and post-2FA login completion.

See [customization.md](./customization.md) and [security.md](./security.md).

---

## 11. Create route handlers

Every auth/account API route is a thin wrapper around `secureAuth.routes.*`:

```typescript
// src/app/api/auth/register/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.register.POST;
```

```typescript
// src/app/api/auth/login/start/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.loginStart.POST;
```

```typescript
// src/app/api/account/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.account.GET;
export const DELETE = secureAuth.routes.account.DELETE;
```

Full route map: [package-api.md](./package-api.md#secureauthroutes-0111-internal).

Health check:

```typescript
// src/app/api/auth/package-health/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.health.GET;
```

---

## 12. Import styles

In `src/app/globals.css`:

```css
@import "tailwindcss";
@import "@tgoliveira/secure-auth/styles.css";
```

Define theme CSS variables (copy from `apps/starter/src/app/globals.css` or define your own):

```css
:root {
  --background: #faf8f5;
  --foreground: #1a1a1a;
  --primary: #4a6741;
  /* ... */
}
```

Import UI from `@tgoliveira/secure-auth/react`.

---

## 13. Wire SecureAuthUIProvider

Page defaults (copy, paths, password policy) come from `secureAuth.uiConfig` — built from your `createSecureAuth({ ui: { ... } })` config.

Password minimum length defaults to **12**. Override in app env (the package does not read env):

```bash
AUTH_PASSWORD_MIN_LENGTH=5
```

Map env into config via `buildSecureAuthConfigFromEnv()` (see `apps/starter` / `apps/consumer-demo`) or set `passwordPolicy: { minLength: 5 }` directly in `createSecureAuth(config)`. The effective value controls UI hints, browser validation, client checks, and server registration/reset/change-password validation.

### Configure UI in createSecureAuth

```typescript
export const secureAuth = createSecureAuth({
  // ... db, auth, email, webauthn ...
  ui: {
    paths: {
      login: "/login",
      register: "/register",
      account: "/settings/account",
      security: "/settings/security",
    },
    messages: {
      loginTitle: "Sign in to My App",
      registerTitle: "Create your account",
    },
  },
});
```

### Wrap the app layout

```tsx
// app/layout.tsx
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import { secureAuth } from "@/lib/secure-auth";

export default function RootLayout({ children }) {
  return (
    <SecureAuthUIProvider config={secureAuth.uiConfig}>
      {children}
    </SecureAuthUIProvider>
  );
}
```

With NextAuth, wrap both providers (see `apps/starter/src/components/providers.tsx`).

Package pages call `useSecureAuthUi()` internally. Per-page props still override provider defaults.

See [customization.md](./customization.md).

---

## 14. Ready-to-use pages

Prefer thin route wrappers instead of rebuilding auth screens:

```tsx
// app/(auth)/login/page.tsx
import { LoginPage } from "@tgoliveira/secure-auth/react";

export default function Page() {
  return <LoginPage appSlug="my-app" />;
}
```

Available pages: `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `CheckEmailPage`, `VerifyEmailPage`, `LoginTwoFactorPage`, `LoginCompletePage`, `AccountSettingsPage`, `SecuritySettingsPage`, `SessionsSettingsPage`, `AccountDeletedPage`, optional `DashboardPlaceholderPage`.

Customize via props (`title`, `paths`, `afterLoginPath`, `passwordStrengthPosition`, `onSignOut`, …) or via `uiConfig` provider defaults (including `passwordStrength.position`). See [package-api.md](./package-api.md) and [customization.md](./customization.md).

---

## 15. Start the application

Required environment variables (minimum) — full list in [configuration-reference.md](./configuration-reference.md):

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<long-random-string>
NEXTAUTH_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
TWO_FACTOR_SECRET_ENCRYPTION_KEY=<32-byte-base64>
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
EMAIL_FROM=My App <noreply@localhost>
```

```bash
npm run dev
```

Recommended `next.config.ts`:

```typescript
const nextConfig = {
  transpilePackages: ["next-auth"],
  serverExternalPackages: ["postgres", "bcryptjs", "@simplewebauthn/server"],
};
export default nextConfig;
```

---

## 16. Verify installation

1. `GET /api/auth/package-health` returns `{ ok: true, version: "0.1.4-internal" }`.
2. Register a user at `/register`.
3. Complete email verification (check console/Mailpit).
4. Sign in at `/login`.
5. Enable 2FA and register a passkey under settings.
6. Run [consumer-validation-checklist.md](./consumer-validation-checklist.md).

Reference implementation: `apps/starter/` in this monorepo.

---

## Production checklist

Before production deployment:

- [ ] Configure real SMTP provider (see email providers table in [apps/starter/README.md](../apps/starter/README.md))
- [ ] Configure OAuth redirect URIs for production domain
- [ ] Rotate all secrets (Auth.js, OAuth, TOTP encryption, SMTP)
- [ ] Verify logging redaction in production log sink
- [ ] Verify rate limits on sensitive endpoints
- [ ] Run full test suite with ≥ 95% coverage
- [ ] Review [security.md](./security.md)

---

## What not to do

| Do not | Do instead |
| --- | --- |
| Import `@tgoliveira/secure-auth/server` | Use `@tgoliveira/secure-auth/next` → `createSecureAuth` |
| Call `createRoutes` or `createAuthServices` | Use `secureAuth.routes.*` |
| Call `getSecureAuthConfig()` or other runtime helpers | Pass config via `createSecureAuth`; use `secureAuth.uiConfig` for UI |
| Deep-import `packages/secure-auth/src/**` | Use [public entry points](./package-api.md) only |
| Read auth secrets from package `process.env` | Map env → `createSecureAuth(config)` in your app |
