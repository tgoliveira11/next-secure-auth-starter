# Package API

Package: `@tgoliveira/secure-auth` @ `0.1.1-internal`

**Consumer onboarding:** [consumer-quick-start.md](./consumer-quick-start.md) · [minimal-consumer-example.md](./minimal-consumer-example.md) · [consumer-validation-checklist.md](./consumer-validation-checklist.md)

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
| **Purpose** | Default UI primitives (Button, Card, Input, FormField, …) |
| **Audience** | App pages and settings components |
| **Example** | `import { Button, Card } from "@tgoliveira/secure-auth/react"` |

Server-safe components. No `"use client"` required for these exports.

---

### `@tgoliveira/secure-auth/react/client`

| | |
| --- | --- |
| **Purpose** | Client-only UI (`ConfirmDialog`, hooks) |
| **Audience** | Client components (`"use client"`) |
| **Example** | `import { ConfirmDialog } from "@tgoliveira/secure-auth/react/client"` |

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
| `@tgoliveira/secure-auth/server` | **Removed** — export path deleted in `0.1.1-internal` |
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

The package does **not** read runtime environment variables. Map env → config in your app:

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

See [consumer-quick-start.md](./consumer-quick-start.md) for complete examples.

---

## Runtime ownership (0.1.x temporary limitation)

`createSecureAuth(config)` binds scoped runtime state for Next.js route compatibility. Acceptable for single-app deployments; not ideal for multiple isolated auth instances per process. **0.2.x target:** constructor-based DI. See [architecture.md](./architecture.md).

---

## Health route

`secureAuth.routes.health.GET` returns:

```json
{ "ok": true, "package": "@tgoliveira/secure-auth", "version": "0.1.1-internal" }
```

Version comes from `SECURE_AUTH_PACKAGE_VERSION` — not a hardcoded route string.

---

## `secureAuth.routes` (0.1.1-internal)

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
