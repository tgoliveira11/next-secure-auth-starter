# Package API

Package: `@tgoliveira/secure-auth` @ `0.1.9-internal`

**Consumer onboarding:** [configuration-reference.md](./configuration-reference.md) · [consumer-quick-start.md](./consumer-quick-start.md) · [minimal-consumer-example.md](./minimal-consumer-example.md) · [apps/consumer-demo](../apps/consumer-demo) · [consumer-validation-checklist.md](./consumer-validation-checklist.md)

---

## Composition root

**`createSecureAuth(config)` from `@tgoliveira/secure-auth/next` is the only supported way to wire the package.**

```typescript
import { createSecureAuth } from "@tgoliveira/secure-auth/next";

export const secureAuth = createSecureAuth(config);
// secureAuth.routes.register.POST
// secureAuth.routes.loginStart.POST
// secureAuth.getServices() — advanced; prefer routes.*
```

Consumers must:

- create **one** `secureAuth` instance at app startup;
- expose API routes via `secureAuth.routes.*`;
- pass configuration explicitly (including `EmailProvider`, OAuth, WebAuthn);
- map environment variables in **app code**, not inside the package.

Consumers must **not**:

- import `@tgoliveira/secure-auth/server` (removed);
- call `createRoutes`, `createAuthServices`, or `createRouteHandlers`;
- call internal runtime helpers (`getSecureAuthConfig`, `getSecureAuthDb`, etc.).

---

## Supported public entry points

### `@tgoliveira/secure-auth`

| | |
| --- | --- |
| **Purpose** | Core types, schema re-exports, package version, logger helper |
| **Audience** | Server-side app wiring, email adapters |
| **Example** | `import { authSchema, SECURE_AUTH_PACKAGE_VERSION, safeLogger } from "@tgoliveira/secure-auth"` |

Exports include: `SecureAuthConfig`, `SecureAuthDb`, `SecureAuthServices` (types), `EmailProvider`, `authSchema`, `SECURE_AUTH_PACKAGE_VERSION`, `safeLogger`.

---

### `@tgoliveira/secure-auth/next`

| | |
| --- | --- |
| **Purpose** | **`createSecureAuth(config)`** — composition root; route handlers; NextAuth factory |
| **Audience** | App bootstrap (`src/lib/secure-auth.ts`), API routes, NextAuth route |
| **Example** | `import { createSecureAuth, createNextAuthRouteHandlers } from "@tgoliveira/secure-auth/next"` |

This is the **primary integration entry point**.

---

### `@tgoliveira/secure-auth/react`

| | |
| --- | --- |
| **Purpose** | UI primitives **and ready-to-use auth/account/security page components** |
| **Audience** | Thin Next.js `page.tsx` wrappers in consumer apps |
| **Example** | `import { LoginPage, RegisterPage } from "@tgoliveira/secure-auth/react"` |

Server-safe primitives (Button, Card, Input, …) do not require `"use client"`. **Page components are client components** — import them from route files directly; Next.js handles the boundary.

#### Ready-to-use pages

| Export | Route (defaults) | Notes |
| --- | --- | --- |
| `LoginPage` | `/login` | Email/password, passkey, OAuth |
| `RegisterPage` | `/register` | Optional `passwordPolicy` prop |
| `ForgotPasswordPage` | `/forgot-password` | |
| `ResetPasswordPage` | `/reset-password` | Reads `?token=` |
| `CheckEmailPage` | `/check-email` | Reads `?email=` / `?required=` |
| `VerifyEmailPage` | `/verify-email` | Reads `?token=` |
| `LoginTwoFactorPage` | `/login/2fa` | Reads `?mode=` / `?error=` |
| `LoginCompletePage` | `/login/complete` | OAuth/login-token completion |
| `AccountSettingsPage` | `/settings/account` | Requires session; optional `onSignOut` |
| `SecuritySettingsPage` | `/settings/security` | Requires `appSlug` for passkey/2FA |
| `SessionsSettingsPage` | `/settings/sessions` | Optional `onSignOut` |
| `AccountDeletedPage` | `/account-deleted` | Post-deletion confirmation |
| `DashboardPlaceholderPage` | `/dashboard` | Optional placeholder; used by consumer-demo |

Shared customization props (all pages): `title`, `description`, `subtitle`, `brand`, `footer`, `header`, `className`, `width`, `paths`, `appName`, `passwordStrengthPosition`.

When wrapped in `SecureAuthUIProvider`, pages inherit defaults from `secureAuth.uiConfig` (`appSlug`, `appName`, `paths`, `messages`, `passwordPolicy`, `passwordStrength`). Props on individual pages override provider values.

#### SecureAuthUIProvider

| Export | Purpose |
| --- | --- |
| `SecureAuthUIProvider` | Client context for page defaults from `secureAuth.uiConfig` |
| `useSecureAuthUi()` | Read provider config in package pages or custom components |
| `SecureAuthUIPublicConfig` | Type for serializable UI config (no secrets); includes `passwordStrength.position` |

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

Build config in `createSecureAuth({ ui: { paths, messages, cssVariables, passwordStrength } })`. See [customization.md](./customization.md).

Path overrides via `paths` or per-page props such as `afterLoginPath`, `loginPath`, `registerPath`.

Helpers: `DEFAULT_AUTH_PATHS`, `resolveAuthPaths()`.

Feature building blocks (optional composition): `CredentialsLoginForm`, `SocialSignIn`, `PasskeySettings`, `TwoFactorSettings`, … — same export entry.

**Example — thin page wrapper:**

```tsx
// app/(auth)/login/page.tsx
import { LoginPage } from "@tgoliveira/secure-auth/react";

export default function Page() {
  return <LoginPage appSlug="my-app" afterLoginPath="/dashboard" />;
}
```

```tsx
// app/(auth)/register/page.tsx
import { RegisterPage } from "@tgoliveira/secure-auth/react";
import { getPasswordPolicyConfig } from "@tgoliveira/secure-auth/client/password-policy";

export default function Page() {
  return (
    <RegisterPage
      appSlug="my-app"
      passwordPolicy={getPasswordPolicyConfig(/* from createSecureAuth config */)}
    />
  );
}
```

**App-owned (not exported as pages):** marketing landing, app shell navigation, providers wrapper, dev auth trace panel.

---

### `@tgoliveira/secure-auth/react/client`

| | |
| --- | --- |
| **Purpose** | Client-only UI (`ConfirmDialog`, hooks, passkey sign-in helper, default sign-out) |
| **Audience** | Client components (`"use client"`) |
| **Example** | `import { ConfirmDialog, defaultSignOutAccount, signInWithPasskey } from "@tgoliveira/secure-auth/react/client"` |

---

### `@tgoliveira/secure-auth/client`

| | |
| --- | --- |
| **Purpose** | Browser-safe API client, passkey helpers, formatters, cookie name builders |
| **Audience** | Client components, shared isomorphic helpers |
| **Example** | `import { accountApi, passkeyLoginApi, buildLoginPendingTokenCookieName } from "@tgoliveira/secure-auth/client"` |

---

### `@tgoliveira/secure-auth/client/password-policy`

| | |
| --- | --- |
| **Purpose** | Password policy assessment (safe for server components) |
| **Audience** | Register/change-password UI |
| **Example** | `import { assessPassword, getPasswordPolicyConfig } from "@tgoliveira/secure-auth/client/password-policy"` |

---

### `@tgoliveira/secure-auth/drizzle/schema`

| | |
| --- | --- |
| **Purpose** | Auth Drizzle schema — single source of truth for auth tables |
| **Audience** | App DB client setup |
| **Example** | `import { authSchema, users } from "@tgoliveira/secure-auth/drizzle/schema"` |

---

### `@tgoliveira/secure-auth/email`

| | |
| --- | --- |
| **Purpose** | `EmailProvider` and template types |
| **Audience** | App email adapter |
| **Example** | `import type { EmailProvider } from "@tgoliveira/secure-auth/email"` |

---

### `@tgoliveira/secure-auth/styles.css`

| | |
| --- | --- |
| **Purpose** | Tailwind v4 `@source` registration for package UI classes |
| **Audience** | App global CSS |
| **Example** | `@import "@tgoliveira/secure-auth/styles.css";` in `globals.css` |

Not a TypeScript import — use in CSS only.

---

## Unsupported entry points

**Do not import these.** They are not published, not supported, and may break without notice.

| Import / API | Status |
| --- | --- |
| `@tgoliveira/secure-auth/server` | **Removed** — export path deleted in `0.1.4-internal` |
| `createRoutes` | **Internal** — use `createSecureAuth(config).routes.*` |
| `createAuthServices` | **Internal** — use `createSecureAuth(config)` |
| `createRouteHandlers` | **Removed** — legacy 501 stubs; never use |
| `getSecureAuthConfig()`, `getSecureAuthDb()` | **Internal** — do not call from consumer code |
| `packages/secure-auth/src/**` deep imports | **Unsupported** — use public exports only |

If TypeScript resolves any of the above, your bundler config or IDE paths are wrong — fix imports to match this document.

---

## Peer dependencies

Install in the **consumer application**:

```bash
npm install next@^16 react@^19 react-dom@^19 next-auth@^4.24.11 drizzle-orm@^0.44.2
```

Also required (consumer-owned, not package peers): PostgreSQL driver (`postgres` recommended).

---

## Configuration (`SecureAuthConfig`)

The package does **not** read runtime environment variables. Map env → config in your app.

**Canonical reference:** [configuration-reference.md](./configuration-reference.md)

```typescript
createSecureAuth({
  db,
  app: { name, slug, baseUrl },
  auth: {
    afterLoginPath,
    afterLogoutPath,
    requireEmailVerificationBeforeSignIn,
    nextAuthSecret,
    twoFactorEncryptionKey,
  },
  webauthn: { rpId, rpName, origin },
  email: { from, provider },
  oauth?: { google?, apple?, microsoft? },
  passwordPolicy?, sessions?, rateLimit?, server?, debug?, accountPolicy?, ui?,
});
```

**`sessions` options:**

| Option | Default | Purpose |
| --- | --- | --- |
| `maxAgeSeconds` | 30 days | Account session row expiry |
| `lastUsedUpdateIntervalSeconds` | 300 | Throttle for `lastUsedAt` updates |
| `singleActiveSession` | `false` | When `true`, revoke all other sessions after each successful login |

Returns:

| Property | Purpose |
| --- | --- |
| `routes` | All API route handlers |
| `uiConfig` | Serializable UI defaults for `SecureAuthUIProvider` |
| `passwordPolicy` | Resolved effective password policy (same as `uiConfig.passwordPolicy`) |
| `getPublicUIConfig()` | Same as `uiConfig` |
| `getServices()` | Advanced; prefer `routes.*` |
| `config` | Original `SecureAuthConfig` |

See [consumer-quick-start.md](./consumer-quick-start.md) for complete examples.

---

## Dependency injection

`createSecureAuth(config)` is the sole composition root. Services receive `config` and `db` via constructor injection — **no global runtime state**. Do not call internal helpers from consumer code.

---

## Health route

`secureAuth.routes.health.GET` returns:

```json
{ "ok": true, "package": "@tgoliveira/secure-auth", "version": "0.1.9-internal" }
```

Version comes from `SECURE_AUTH_PACKAGE_VERSION` — not a hardcoded route string.

---

## `secureAuth.routes` (0.1.4-internal)

All routes are real implementations — no 501 stubs.

| Route key | Methods |
| --- | --- |
| `health` | GET |
| `register` | POST |
| `forgotPassword` | POST |
| `resetPassword` | POST |
| `verifyEmailConfirm` | POST |
| `verifyEmailResend` | POST |
| `loginStart` | POST |
| `loginComplete` | POST |
| `loginVerify2fa` | POST |
| `loginVerify2faOauth` | POST |
| `loginStartForm` | POST |
| `loginVerify2faForm` | POST |
| `loginChallengeStatus` | GET |
| `passkeyLoginOptions` | POST |
| `passkeyLoginVerify` | POST |
| `passwordPolicy` | GET |
| `account` | GET, DELETE |
| `accountAuthStatus` | GET |
| `changePassword` | POST |
| `passkeysList` | GET |
| `passkeyRegister` | POST |
| `passkeyDelete` | DELETE |
| `sessionsList` | GET |
| `sessionDelete` | DELETE |
| `sessionsPing` | POST |
| `sessionsRevokeCurrent` | POST |
| `sessionsRevokeOthers` | POST |
| `sessionsRevokeAll` | POST |
| `twoFactorStatus` | GET |
| `twoFactorSetupStart` | POST |
| `twoFactorSetupVerify` | POST |
| `twoFactorDisable` | POST |
| `twoFactorBackupCodes` | POST |

---

## Example: app route wrapper

```typescript
// src/app/api/auth/register/route.ts
import { secureAuth } from "@/lib/secure-auth";

export const POST = secureAuth.routes.register.POST;
```

Use dynamic import in routes if you need to defer loading during Next.js build analysis:

```typescript
export async function POST(request: Request) {
  const { secureAuth } = await import("@/lib/secure-auth");
  return secureAuth.routes.loginStart.POST(request);
}
```

---

## Build artifacts

Published tarball contains: `dist/`, `migrations/`, `styles.css`, `README.md`. No `src/`. Sourcemaps omit embedded `sourcesContent`.
