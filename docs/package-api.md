# Package API

Package: `@tgoliveira/secure-auth` @ `0.1.0`

## Public exports

### `@tgoliveira/secure-auth`

```typescript
import {
  createAuthServices,
  authSchema,
  type SecureAuthConfig,
  type SecureAuthDb,
  type SecureAuthServices,
  type EmailProvider,
} from "@tgoliveira/secure-auth";
```

### `@tgoliveira/secure-auth/next`

```typescript
import { createSecureAuth, type SecureAuth } from "@tgoliveira/secure-auth/next";

const secureAuth = createSecureAuth(config);
// secureAuth.config
// secureAuth.getServices() — async service registry
// secureAuth.routes.*
```

### `@tgoliveira/secure-auth/react`

```typescript
import { Button, Card, Input, FormField, /* ... */ } from "@tgoliveira/secure-auth/react";
```

### `@tgoliveira/secure-auth/server`

```typescript
import { createAuthServices, createRouteHandlers } from "@tgoliveira/secure-auth/server";
```

### `@tgoliveira/secure-auth/drizzle/schema`

```typescript
import { users, authSchema, type AuthSchema, type User } from "@tgoliveira/secure-auth/drizzle/schema";
```

### `@tgoliveira/secure-auth/email`

```typescript
import type { EmailProvider, SecureAuthEmailTemplates } from "@tgoliveira/secure-auth/email";
```

## `secureAuth.routes` (0.1.0)

| Route key | Methods | Status |
| --- | --- | --- |
| `health` | GET | Implemented |
| `loginStart` | POST | Implemented |
| `loginComplete` | POST | 501 stub |
| `register` | POST | 501 stub |
| `verifyEmail` | POST | 501 stub |
| `passwordResetStart` | POST | 501 stub |
| `passwordResetComplete` | POST | 501 stub |
| `twoFactorSetup` | POST | 501 stub |
| `twoFactorVerify` | POST | 501 stub |
| `passkeyRegister` | POST | 501 stub |
| `passkeyAuthenticate` | POST | 501 stub |
| `sessions` | GET, DELETE | 501 stub |

## Intentionally not public

- `packages/secure-auth/src/modules/**` (deep imports)
- `packages/secure-auth/src/lib/**`
- `packages/secure-auth/migrations/**` (consumed via drizzle-kit, not TypeScript imports)
- App aliases (`@/lib`, `@/server`, etc.) inside the package

## Example: app route wrapper

```typescript
export async function POST(request: Request) {
  const { secureAuth } = await import("@/lib/secure-auth");
  return secureAuth.routes.loginStart.POST(request);
}
```

Dynamic import defers heavy service loading during Next.js production builds.
