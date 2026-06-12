# Package API

Package: `@tgoliveira/secure-auth` @ `0.1.0-internal`

See also [PACKAGE_HARDENING_REPORT.md](./PACKAGE_HARDENING_REPORT.md) for the package-purity audit.

## Public exports

### `@tgoliveira/secure-auth`

```typescript
import {
  createAuthServices,
  authSchema,
  safeLogger,
  type SecureAuthConfig,
  type SecureAuthDb,
  type SecureAuthServices,
  type EmailProvider,
} from "@tgoliveira/secure-auth";
```

### `@tgoliveira/secure-auth/next`

```typescript
import { createSecureAuth, createNextAuthRouteHandlers, type SecureAuth } from "@tgoliveira/secure-auth/next";

export const secureAuth = createSecureAuth(config);
// secureAuth.config
// secureAuth.getServices() — async service registry
// secureAuth.routes.* — all API route handlers
```

**This is the only supported route registration path.** Call `createSecureAuth(config)` once; expose handlers via `secureAuth.routes.<name>.<METHOD>`.

### `@tgoliveira/secure-auth/react`

```typescript
import { Button, Card, Input, FormField /* ... */ } from "@tgoliveira/secure-auth/react";
```

### `@tgoliveira/secure-auth/react/client`

Client-only UI (`ConfirmDialog`, hooks).

### `@tgoliveira/secure-auth/client`

Browser-safe API client, passkey helpers, OAuth UI constants, formatters, cookie/storage **name builders** (not server cookie mutation helpers).

### `@tgoliveira/secure-auth/client/password-policy`

Password policy assessment helpers safe for server components.

### `@tgoliveira/secure-auth/server`

Advanced/server-only wiring (most apps use `/next` instead):

```typescript
import { createAuthServices, createRoutes, type SecureAuthRoutes } from "@tgoliveira/secure-auth/server";
```

`createRouteHandlers` was **removed** — it contained 501 stubs and duplicated `createRoutes`.

### `@tgoliveira/secure-auth/drizzle/schema`

```typescript
import { users, authSchema, type AuthSchema, type User } from "@tgoliveira/secure-auth/drizzle/schema";
```

### `@tgoliveira/secure-auth/email`

```typescript
import type { EmailProvider, SecureAuthEmailTemplates } from "@tgoliveira/secure-auth/email";
```

### `@tgoliveira/secure-auth/styles.css`

Import from the consuming app's global CSS (Tailwind v4):

```css
@import "tailwindcss";
@import "@tgoliveira/secure-auth/styles.css";
```

## Configuration (`SecureAuthConfig`)

The package does **not** read runtime environment variables. The consuming app maps env → config at its boundary:

```typescript
createSecureAuth({
  db,
  app: { name, slug, baseUrl },
  auth: {
    afterLoginPath,
    afterLogoutPath,
    requireEmailVerificationBeforeSignIn,
    nextAuthSecret,           // was NEXTAUTH_SECRET
    twoFactorEncryptionKey,   // was TWO_FACTOR_SECRET_ENCRYPTION_KEY
  },
  webauthn: { rpId, rpName, origin },
  email: { from, provider },
  passwordPolicy?: { enforcement, minLength, /* ... */ },
  sessions?: { maxAgeSeconds, lastUsedUpdateIntervalSeconds },
  rateLimit?: { store: "memory" | "postgres" },
  server?: { cookieSecure },
  debug?: { authTrace },
  oauth?: { google?, apple?, microsoft? },
  accountPolicy?: { sendVerificationOnRegister, requireEmailVerificationBeforeSignIn },
  ui?: { brand, paths, messages, cssVariables },
});
```

## Runtime ownership

`createSecureAuth(config)` calls `initSecureAuthRuntime(config)` and is the **composition root**.

Internal modules resolve config through `getSecureAuthConfig()`. This is intentional for 0.1.x; full constructor injection is planned for 0.2.x. See the hardening report for accepted technical debt.

## `secureAuth.routes` (0.1.0-internal)

All routes resolve to real implementations via `createRoutes` — **no 501 stubs**.

| Route key | Methods | Notes |
| --- | --- | --- |
| `register` | POST | |
| `forgotPassword` | POST | |
| `resetPassword` | POST | |
| `verifyEmailConfirm` | POST | |
| `verifyEmailResend` | POST | |
| `loginStart` | POST | |
| `loginComplete` | POST | |
| `loginVerify2fa` | POST | |
| `loginVerify2faOauth` | POST | |
| `loginStartForm` | POST | |
| `loginVerify2faForm` | POST | |
| `loginChallengeStatus` | GET | |
| `passkeyLoginOptions` | POST | |
| `passkeyLoginVerify` | POST | |
| `passwordPolicy` | GET | |
| `account` | GET, DELETE | |
| `accountAuthStatus` | GET | |
| `changePassword` | POST | |
| `passkeysList` | GET | |
| `passkeyRegister` | POST | |
| `passkeyDelete` | DELETE | |
| `sessionsList` | GET | |
| `sessionDelete` | DELETE | |
| `sessionsPing` | POST | |
| `sessionsRevokeCurrent` | POST | |
| `sessionsRevokeOthers` | POST | |
| `sessionsRevokeAll` | POST | |
| `twoFactorStatus` | GET | |
| `twoFactorSetupStart` | POST | |
| `twoFactorSetupVerify` | POST | |
| `twoFactorDisable` | POST | |
| `twoFactorBackupCodes` | POST | |

## Intentionally not public

- `packages/secure-auth/src/**` (deep imports)
- `modules/security/env/load-env` (starter-owned dotenv loading)
- Server cookie mutation helpers (`clearLoginPendingTokenCookie`, etc.)
- Test-only runtime reset helpers

## Example: app route wrapper

```typescript
export async function POST(request: Request) {
  const { secureAuth } = await import("@/lib/secure-auth");
  return secureAuth.routes.loginStart.POST(request);
}
```

Dynamic import defers heavy service loading during Next.js production builds.
