# @tgoliveira/secure-auth

**Version:** `0.1.2-internal` (experimental — not production-ready)

Opinionated authentication package for **Next.js App Router**, **TypeScript**, **Drizzle ORM**, and **PostgreSQL**.

---

## Composition root (read this first)

**Consumers integrate exclusively through:**

```typescript
import { createSecureAuth } from "@tgoliveira/secure-auth/next";

export const secureAuth = createSecureAuth(config);
// secureAuth.routes.register.POST
// secureAuth.uiConfig → SecureAuthUIProvider
```

| Do | Don't |
| --- | --- |
| Create **one** `secureAuth` instance in app bootstrap | Import `@tgoliveira/secure-auth/server` (removed) |
| Wire routes: `secureAuth.routes.register.POST` | Call `createRoutes` or `createAuthServices` |
| Pass `secureAuth.uiConfig` to `SecureAuthUIProvider` | Call internal runtime helpers |
| Map env vars in **your app** | Expect the package to read `process.env` |

**Onboarding docs:** [consumer-quick-start.md](../../docs/consumer-quick-start.md) · [minimal-consumer-example.md](../../docs/minimal-consumer-example.md) · [package-api.md](../../docs/package-api.md)

---

## UI provider

Page copy, paths, and password policy defaults come from config — not global state.

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

Configure via `createSecureAuth({ ui: { paths, messages, cssVariables } })`. Package pages use `useSecureAuthUi()` internally.

See [customization.md](../../docs/customization.md) and [architecture.md](../../docs/architecture.md).

---

## Install (consumer app)

```bash
npm install @tgoliveira/secure-auth@0.1.2-internal \
  next@^16 react@^19 react-dom@^19 next-auth@^4.24.11 drizzle-orm@^0.44.2
```

See [publishing-private-package.md](../../docs/publishing-private-package.md) for GitHub Packages registry setup.

---

## Supported public entry points

| Import | Purpose |
| --- | --- |
| `@tgoliveira/secure-auth/next` | **`createSecureAuth(config)`** — composition root |
| `@tgoliveira/secure-auth` | Types, `SECURE_AUTH_PACKAGE_VERSION`, `authSchema`, `safeLogger` |
| `@tgoliveira/secure-auth/react` | UI primitives, pages, **`SecureAuthUIProvider`**, `SecureAuthUIPublicConfig` |
| `@tgoliveira/secure-auth/react/client` | Client-only UI, passkey sign-in, default sign-out |
| `@tgoliveira/secure-auth/client` | Browser API client, passkey helpers |
| `@tgoliveira/secure-auth/client/password-policy` | Password policy helpers |
| `@tgoliveira/secure-auth/drizzle/schema` | Auth Drizzle schema |
| `@tgoliveira/secure-auth/email` | `EmailProvider` types |
| `@tgoliveira/secure-auth/styles.css` | Tailwind v4 source registration (CSS import) |

**Unsupported:** `@tgoliveira/secure-auth/server`, `createRoutes`, `createAuthServices`, deep `src/**` imports.

Full reference: [package-api.md](../../docs/package-api.md).

---

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
    paths: { login: "/login", register: "/register" },
    messages: { loginTitle: "Sign in to My App" },
  },
});
```

## Route handlers

Thin App Router wrappers in the consuming app:

```typescript
// src/app/api/auth/register/route.ts
import { secureAuth } from "@/lib/secure-auth";

export const POST = secureAuth.routes.register.POST;
```

All handlers: `secureAuth.routes.*`. Route map: [package-api.md](../../docs/package-api.md).

## Tailwind CSS (v4)

```css
@import "tailwindcss";
@import "@tgoliveira/secure-auth/styles.css";
```

Define `:root` CSS variables for theme tokens (see starter `globals.css`).

## EmailProvider

Account email flows through your injected provider only. Transport lives in the app; templates use `config.app.name` and `config.app.baseUrl`.

Reference: `apps/starter/src/modules/email/core/` + `apps/starter/src/lib/secure-auth.ts`.

## Configuration

The package does **not** read runtime environment variables. Map secrets at the app boundary in `createSecureAuth(config)`.

Services receive `config` and `db` via constructor injection — there is no global runtime state.

See [architecture.md](../../docs/architecture.md).

## Database

- Schema: `@tgoliveira/secure-auth/drizzle/schema`
- Migrations: shipped in package `migrations/` folder
- App owns `DATABASE_URL`; package owns auth tables

See [migrations.md](../../docs/migrations.md) and [consumer-quick-start.md](../../docs/consumer-quick-start.md).

## Versioning

| Range | Meaning |
| --- | --- |
| `0.1.x` | Experimental internal |
| `0.2.x` | DB contract may break; API stabilization |
| `1.0.0` | Production-ready contract |

## Security

See [security.md](../../docs/security.md). Not production-ready at `0.1.x`.
