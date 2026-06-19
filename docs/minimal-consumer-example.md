# Minimal consumer example

Smallest working integration of `@tgoliveira/secure-auth@0.1.25` in a new Next.js App Router app.

Uses **public exports only**. See [consumer-quick-start.md](./consumer-quick-start.md) for the full guide.

**Working reference in this monorepo:** [apps/consumer-demo](../apps/consumer-demo) implements this pattern end-to-end.

---

## Install

```bash
npm install @tgoliveira/secure-auth@0.1.25 \
  next@^16 react@^19 react-dom@^19 next-auth@^4.24.11 drizzle-orm@^0.44.2 postgres
npm install -D drizzle-kit
```

---

## Database client

`src/lib/db/index.ts`:

```typescript
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { authSchema } from "@tgoliveira/secure-auth/drizzle/schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema: authSchema });
```

---

## Composition root

`src/lib/secure-auth.ts`:

```typescript
import "server-only";
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import type { EmailProvider } from "@tgoliveira/secure-auth/email";
import { db } from "@/lib/db";

const emailProvider: EmailProvider = {
  async send({ to, subject, html, text }) {
    console.log("[email]", { to, subject, html, text });
  },
};

export const secureAuth = createSecureAuth({
  db,
  app: {
    name: "My App",
    slug: "my-app",
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
    from: "My App <noreply@localhost>",
    provider: emailProvider,
  },
  webauthn: {
    rpId: "localhost",
    rpName: "My App",
    origin: process.env.APP_BASE_URL ?? "http://localhost:3000",
  },
  ui: {
    paths: { login: "/login", register: "/register" },
    messages: { loginTitle: "Sign in" },
  },
});
```

---

## UI provider

`src/components/providers.tsx`:

```tsx
"use client";
import { SessionProvider } from "next-auth/react";
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import type { SecureAuthUIPublicConfig } from "@tgoliveira/secure-auth/react";

export function Providers({
  children,
  uiConfig,
}: {
  children: React.ReactNode;
  uiConfig: SecureAuthUIPublicConfig;
}) {
  return (
    <SessionProvider>
      <SecureAuthUIProvider config={uiConfig}>{children}</SecureAuthUIProvider>
    </SessionProvider>
  );
}
```

`src/app/layout.tsx`:

```tsx
import { Providers } from "@/components/providers";
import { secureAuth } from "@/lib/secure-auth";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers uiConfig={secureAuth.uiConfig}>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## API routes

Wire every handler from the [route map](./package-api.md#route-map). Each file is a thin wrapper around `secureAuth.routes.*`.

### Auth routes

```typescript
// src/app/api/auth/package-health/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.health.GET;
```

```typescript
// src/app/api/auth/register/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.register.POST;
```

```typescript
// src/app/api/auth/forgot-password/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.forgotPassword.POST;
```

```typescript
// src/app/api/auth/reset-password/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.resetPassword.POST;
```

```typescript
// src/app/api/auth/verify-email/confirm/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.verifyEmailConfirm.POST;
```

```typescript
// src/app/api/auth/verify-email/resend/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.verifyEmailResend.POST;
```

```typescript
// src/app/api/auth/login/start/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.loginStart.POST;
```

```typescript
// src/app/api/auth/login/start-form/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.loginStartForm.POST;
```

```typescript
// src/app/api/auth/login/complete/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.loginComplete.POST;
```

```typescript
// src/app/api/auth/login/verify-2fa/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.loginVerify2fa.POST;
```

```typescript
// src/app/api/auth/login/verify-2fa-form/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.loginVerify2faForm.POST;
```

```typescript
// src/app/api/auth/login/verify-2fa-oauth/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.loginVerify2faOauth.POST;
```

```typescript
// src/app/api/auth/login/challenge-status/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.loginChallengeStatus.GET;
```

```typescript
// src/app/api/auth/login/trace/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.loginTrace.GET;
```

```typescript
// src/app/api/auth/passkey/login/options/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.passkeyLoginOptions.POST;
```

```typescript
// src/app/api/auth/passkey/login/verify/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.passkeyLoginVerify.POST;
```

```typescript
// src/app/api/auth/password-policy/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.passwordPolicy.GET;
```

### Account routes

```typescript
// src/app/api/account/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.account.GET;
export const DELETE = secureAuth.routes.account.DELETE;
```

```typescript
// src/app/api/account/auth-status/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.accountAuthStatus.GET;
```

```typescript
// src/app/api/account/change-password/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.changePassword.POST;
```

```typescript
// src/app/api/account/passkeys/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.passkeysList.GET;
```

```typescript
// src/app/api/account/passkeys/register/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.passkeyRegister.POST;
```

```typescript
// src/app/api/account/passkeys/[id]/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const DELETE = secureAuth.routes.passkeyById.DELETE;
```

```typescript
// src/app/api/account/2fa/status/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.twoFactorStatus.GET;
```

```typescript
// src/app/api/account/2fa/setup/start/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.twoFactorSetupStart.POST;
```

```typescript
// src/app/api/account/2fa/setup/verify/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.twoFactorSetupVerify.POST;
```

```typescript
// src/app/api/account/2fa/disable/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.twoFactorDisable.POST;
```

```typescript
// src/app/api/account/2fa/backup-codes/regenerate/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.twoFactorBackupCodesRegenerate.POST;
```

```typescript
// src/app/api/account/sessions/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const GET = secureAuth.routes.sessionsList.GET;
```

```typescript
// src/app/api/account/sessions/[id]/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const DELETE = secureAuth.routes.sessionById.DELETE;
```

```typescript
// src/app/api/account/sessions/ping/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.sessionsPing.POST;
```

```typescript
// src/app/api/account/sessions/revoke-current/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.sessionsRevokeCurrent.POST;
```

```typescript
// src/app/api/account/sessions/revoke-others/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.sessionsRevokeOthers.POST;
```

```typescript
// src/app/api/account/sessions/revoke-all/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.sessionsRevokeAll.POST;
```

### NextAuth

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const { GET, POST } = secureAuth.routes.nextAuth;
```

---

## Styles

`src/app/globals.css`:

```css
@import "tailwindcss";
@import "@tgoliveira/secure-auth/styles.css";

:root {
  --background: #ffffff;
  --foreground: #111111;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --card: #ffffff;
  --border: #e5e7eb;
  --muted: #6b7280;
  --danger: #dc2626;
}
```

---

## Migrations

`drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";
import path from "node:path";

const pkg = path.join(process.cwd(), "node_modules/@tgoliveira/secure-auth");

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  schema: path.join(pkg, "dist/drizzle/schema.js"),
  out: path.join(pkg, "migrations"),
});
```

```bash
npm run db:migrate   # script: "drizzle-kit migrate"
```

---

## Example pages (thin wrappers)

`src/app/(auth)/login/page.tsx`:

```tsx
import { LoginPage } from "@tgoliveira/secure-auth/react";

export default function Page() {
  return <LoginPage />;
}
```

With `SecureAuthUIProvider` wired, `appSlug` and paths come from `uiConfig`. Pass props to override.

`src/app/(auth)/register/page.tsx`:

```tsx
import { RegisterPage } from "@tgoliveira/secure-auth/react";

export default function Page() {
  return <RegisterPage />;
}
```

Account/security routes: `AccountSettingsPage`, `SecuritySettingsPage`, `SessionsSettingsPage` — see [package-api.md](./package-api.md).

---

## Verify

```bash
curl http://localhost:3000/api/auth/package-health
# {"ok":true,"package":"@tgoliveira/secure-auth","version":"0.1.25"}
```
