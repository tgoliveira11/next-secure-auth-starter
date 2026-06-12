# Minimal consumer example

Smallest working integration of `@tgoliveira/secure-auth@0.1.1-internal` in a new Next.js App Router app.

Uses **public exports only**. See [consumer-quick-start.md](./consumer-quick-start.md) for the full guide.

---

## Install

```bash
npm install @tgoliveira/secure-auth@0.1.1-internal \
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
});
```

---

## Example route

`src/app/api/auth/register/route.ts`:

```typescript
import { secureAuth } from "@/lib/secure-auth";

export const POST = secureAuth.routes.register.POST;
```

---

## NextAuth (OAuth)

`src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import "@/lib/secure-auth";
import NextAuth from "next-auth";
import { createNextAuthRouteHandlers } from "@tgoliveira/secure-auth/next";

export const { GET, POST } = createNextAuthRouteHandlers(NextAuth);
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

## Verify

```bash
curl http://localhost:3000/api/auth/package-health
# {"ok":true,"package":"@tgoliveira/secure-auth","version":"0.1.1-internal"}
```
