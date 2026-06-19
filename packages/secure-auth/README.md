# @tgoliveira/secure-auth

**Version:** see `package.json` (experimental — not production-ready)

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

**Onboarding docs:** [configuration-reference.md](../../docs/configuration-reference.md) · [consumer-quick-start.md](../../docs/consumer-quick-start.md) · [minimal-consumer-example.md](../../docs/minimal-consumer-example.md) · [package-api.md](../../docs/package-api.md)

**In-repo validation app:** [apps/consumer-demo](../../apps/consumer-demo) — minimal consumer with public exports only (see [consumer-demo-validation.md](../../docs/consumer-demo-validation.md)).

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

Configure via `createSecureAuth({ ui: { paths, messages, cssVariables, passwordStrength }, passwordPolicy: { minLength } })`. Package pages use `useSecureAuthUi()` internally when wrapped in `SecureAuthUIProvider config={secureAuth.uiConfig}`. Default minimum password length is **12**; map `AUTH_PASSWORD_MIN_LENGTH` in your app env into `passwordPolicy.minLength` to override (the package never reads env directly). The resolved policy is available as `secureAuth.passwordPolicy` and `secureAuth.uiConfig.passwordPolicy`.

Password strength and validation feedback render **above** password fields by default. Set `ui.passwordStrength.position` to `"below"` to restore legacy placement. The feedback region is stable from first render (neutral requirements before typing; strength updates in place without focus loss). See [customization.md](../../docs/customization.md).

---

## Install (consumer app)

```bash
npm install @tgoliveira/secure-auth@latest \
  next@^16 react@^19 react-dom@^19 next-auth@^4.24.11 drizzle-orm@^0.44.2
```

See [publishing-npm-automation.md](../../docs/publishing-npm-automation.md) for automated npm releases and [consumer-quick-start.md](../../docs/consumer-quick-start.md) for install.

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
    redirectAuthenticatedFromGuestPages: true,
    authenticatedRedirectPath: "/dashboard",
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

Reference: `apps/dev-harness/src/modules/email/core/` + `apps/dev-harness/src/lib/secure-auth.ts`.

## Configuration

The package does **not** read runtime environment variables. Map secrets at the app boundary in `createSecureAuth(config)`.

**Canonical reference:** [configuration-reference.md](../../docs/configuration-reference.md) — every env variable, TypeScript config path, defaults, and parsing rules.

Services receive `config` and `db` via constructor injection — there is no global runtime state.

See [architecture.md](../../docs/architecture.md).

Optional session policy — multiple concurrent sessions is the default. Enable single active session per user via env or config:

```bash
AUTH_SINGLE_ACTIVE_SESSION=true
```

```typescript
createSecureAuth({
  sessions: { singleActiveSession: true },
});
```

See [customization.md](../../docs/customization.md) and [security.md](../../docs/security.md).

When `singleActiveSession` is enabled, other sessions are revoked only after **final** login completion (including post-TOTP verification for passkey and credentials logins).

## Passkeys and two-factor authentication

Passkey sign-in is a primary authentication method. When TOTP 2FA is enabled on the account, passkey verification creates a pending login challenge (same httpOnly cookie and `/login/2fa` flow as email/password). The session is finalized only after valid TOTP verification — passkeys do not bypass app-level 2FA.

**Capability boundaries:** account security settings list passkeys with `signInEnabled` / `vaultUnlockEnabled` metadata. Only pure account sign-in passkeys are removable from account settings; vault-only and dual-capability credentials are protected at the API and UI. Account passkey registration excludes only `signInEnabled: true` credentials from WebAuthn `excludeCredentials`, so vault-only passkeys do not block adding account sign-in passkeys. The package does not silently upgrade vault-only credentials to account sign-in. See [docs/consumer-passkey-capability-boundaries.md](../../docs/consumer-passkey-capability-boundaries.md) and [docs/passkey-registration-capability-boundary-audit.md](../../docs/passkey-registration-capability-boundary-audit.md).

## CAPTCHA (Cloudflare Turnstile)

Optional bot protection for credentials registration and login. Disabled by default.

```typescript
createSecureAuth({
  captcha: {
    enabled: true,
    provider: "turnstile",
    siteKey: "...",
    secretKey: "...",
    pages: { register: true, login: true },
  },
});
```

Server-side Siteverify validation is mandatory when enabled. Only `siteKey` and page flags are exposed via `uiConfig`; `secretKey` stays server-only. OAuth and passkey flows are not CAPTCHA-protected in this release.

## Magic link

Optional passwordless email login. Disabled by default.

```typescript
createSecureAuth({
  auth: {
    magicLink: { enabled: true },
  },
});
```

When enabled, the login page shows a **Sign in with email link** option. The user receives a single-use link valid for 15 minutes. If the account has 2FA enabled, magic link verification creates a pending 2FA challenge (same flow as credentials login). Rate limit: 3 requests per email per 10 minutes. Request responses are anti-enumeration safe.

Wire routes: `magicLinkRequest.POST` → `/api/auth/magic-link/request`, `magicLinkVerify.POST` → `/api/auth/magic-link/verify`. Email links use `GET` on the verify route for browser redirects.

## Generic password components

Reusable password policy UI for **non-auth** flows (vault password, encryption password, etc.).

```tsx
import {
  PasswordStrengthField,
  PasswordSetupFields,
} from "@tgoliveira/secure-auth/react/client";
```

Validation helpers live in `@tgoliveira/secure-auth/client/password-policy`. The package never reads env — map consumer env to a `policy` object and pass it as props.

See [generic-password-components.md](../../docs/generic-password-components.md).

## OAuth providers

Optional social sign-in via NextAuth v4. Map credentials in **your app** — the package never reads `process.env`:

```typescript
createSecureAuth({
  oauth: {
    google: { clientId, clientSecret },
    apple: { clientId, clientSecret },
    github: { clientId, clientSecret },
    microsoft: { clientId, clientSecret, tenantId },
  },
});
```

Supported provider ids: `google`, `apple`, `github`, `azure-ad` (Microsoft). Buttons render only when the matching config block is present. GitHub callback: `{APP_BASE_URL}/api/auth/callback/github`. See [configuration-reference.md](../../docs/configuration-reference.md).

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

See [security.md](../../docs/security.md) for passwords, tokens, HIBP breach detection, and [security notifications](../../docs/security.md#security-notifications). Not production-ready at `0.2.x`.

Before releases: `npm run audit:security` from the monorepo root. Details: [dependency-audit.md](../../docs/security/dependency-audit.md).

## License

MIT © 2026 Thiago Oliveira. See [LICENSE](LICENSE).
