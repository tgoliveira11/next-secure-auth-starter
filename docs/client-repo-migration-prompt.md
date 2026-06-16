# Client repository migration prompt

Copy everything below this line into Cursor in your **client application repository**.

---

You are migrating this Next.js application from a **local/custom authentication implementation** to the published npm package **`@tgoliveira/secure-auth`**.

**Do not** copy source from the `next-secure-auth-starter` monorepo. **Do not** import package internals. Install and integrate from **npm only**.

**Package maturity:** `@tgoliveira/secure-auth@0.1.11-internal` is **experimental** (`0.1.x-internal`). It is published publicly on npm (MIT) but is **not a stable 1.0 production contract**. Treat this migration as adopting an opinionated auth foundation that still requires security review before production.

**Stack requirement:** Next.js 16+ App Router, TypeScript, PostgreSQL, Drizzle ORM, NextAuth v4. This package is **not** framework-agnostic.

---

## Non-negotiable integration rules

### Supported public imports only

| Import | Purpose |
| --- | --- |
| `@tgoliveira/secure-auth` | Types, `authSchema`, `SECURE_AUTH_PACKAGE_VERSION`, `safeLogger` |
| `@tgoliveira/secure-auth/next` | **`createSecureAuth`**, `createNextAuthRouteHandlers` |
| `@tgoliveira/secure-auth/react` | Pages, `SecureAuthUIProvider`, UI primitives |
| `@tgoliveira/secure-auth/react/client` | Client-only helpers (`signInWithPasskey`, `defaultSignOutAccount`, …) |
| `@tgoliveira/secure-auth/client` | Browser API clients, passkey/OAuth helpers |
| `@tgoliveira/secure-auth/client/password-policy` | Password assessment helpers |
| `@tgoliveira/secure-auth/drizzle/schema` | **`authSchema`** — single source of truth for auth tables |
| `@tgoliveira/secure-auth/email` | **`EmailProvider`** type |
| `@tgoliveira/secure-auth/styles.css` | Tailwind v4 styles (CSS import, not TS) |

### Forbidden (must not appear in client code after migration)

- `@tgoliveira/secure-auth/server` — **removed**
- `@tgoliveira/secure-auth/src/*` or any deep source import
- `@tgoliveira/secure-auth/dist/*` deep paths (use package exports)
- `createRoutes`, `createAuthServices`, `createRouteHandlers`
- `getSecureAuthConfig`, `getSecureAuthDb`, or other internal runtime helpers
- Copying auth service/repository code from another repository

### Architecture contract

- **One** `createSecureAuth(config)` call in app bootstrap (e.g. `src/lib/secure-auth.ts`).
- The package **never reads `process.env`**. Your app maps env → typed config.
- Your app owns: DB connection, secrets, email transport, deployment, layout, app-specific authorization, marketing pages.
- The package owns: auth domain logic, API handlers, optional ready-made pages, Drizzle auth schema, SQL migrations, security policies (rate limits, audit, password policy enforcement server-side).

---

## Package capabilities you are adopting

Replace local implementations with the package for:

- Email/password registration and login
- OAuth (Google, Apple, Microsoft) via NextAuth v4
- Passkeys / WebAuthn
- TOTP 2FA and backup codes
- Email verification and resend
- Forgot / reset / change password
- Account sessions: list, ping, revoke current/others/all
- Optional **single active session** policy
- Password policy (configurable enforcement: `off` | `warn` | `enforce`)
- Password strength UI position (`above` | `below`)
- Account settings, security, and sessions pages (ready-to-use)
- Rate limiting (store: `memory` or `postgres`)
- Audit events and security defaults (server-side)

**Account authentication only** — no vault encryption, no product-specific cryptography.

---

## Phase 0 — Inventory existing local auth (do this first)

Create `docs/migrations/secure-auth-inventory.md` documenting everything you will remove or replace.

Search the client repo for:

1. **API routes** — `src/app/api/**` auth, account, session, passkey, 2FA, OAuth paths
2. **Pages** — login, register, forgot/reset password, verify email, settings, security, sessions
3. **Services / modules** — auth services, repositories, password hashing, token logic, session managers
4. **Schema** — local Drizzle/Prisma/SQL auth tables (`users`, `sessions`, `accounts`, passkeys, 2FA, tokens, …)
5. **Middleware** — auth middleware, session checks, redirects
6. **Components** — login forms, 2FA UI, passkey UI, session cards
7. **Dependencies** — `bcrypt`, `otplib`, `@simplewebauthn/*`, custom auth libs
8. **Environment variables** — all auth-related env vars currently used
9. **Tests** — unit/integration/e2e covering auth flows
10. **Email** — verification/reset email sending code

For each item record: file path, purpose, replacement (`secureAuth.routes.*`, package page, or keep as app-specific).

**Keep in the app (do not delete blindly):**

- Product/domain routes and authorization (roles, permissions, feature flags)
- Marketing/landing pages and app shell/navigation
- Non-auth database tables and business logic
- App-specific middleware that is *not* duplicating package auth

---

## Phase 1 — Install package and peers

```bash
npm install @tgoliveira/secure-auth@0.1.11-internal \
  next@^16 react@^19 react-dom@^19 \
  next-auth@^4.24.11 drizzle-orm@^0.45.2 postgres

npm install -D drizzle-kit typescript
```

Verify `package.json` includes peer-compatible versions.

Run `npm audit` after install. Document any overrides your deployment needs.

---

## Phase 2 — Database and migrations

### Drizzle client

Create or update `src/lib/db.ts` (or `src/lib/db/index.ts`):

```typescript
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { authSchema } from "@tgoliveira/secure-auth/drizzle/schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema: authSchema });
```

If the app has **non-auth tables**, merge schemas — do not duplicate auth tables:

```typescript
import { authSchema } from "@tgoliveira/secure-auth/drizzle/schema";
import * as appSchema from "./app-schema";

export const schema = { ...authSchema, ...appSchema };
```

### Drizzle Kit config

Point at the **published** package schema and migrations:

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./node_modules/@tgoliveira/secure-auth/dist/drizzle/schema.js",
  out: "./drizzle", // optional: only if you generate app-specific migrations
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
});
```

Apply package migrations from the published tarball:

```bash
# Option A: drizzle-kit migrate with migrations folder copied or referenced from:
# node_modules/@tgoliveira/secure-auth/migrations/

npx drizzle-kit migrate
```

**Migration strategy:**

1. **Greenfield / dev:** apply package migrations to a fresh database.
2. **Existing users table:** plan a **data migration** — map local user columns to package `users` schema. Do not run blindly on production without a backup and migration script.
3. **Forward-only:** package migrations do not auto-rollback. Restore from snapshot or write compensating migrations.

Remove **duplicate** local auth table definitions from app schema after cutover.

Document the migration plan in `docs/migrations/secure-auth-db-plan.md`.

---

## Phase 3 — Environment variables

Update `.env.example` with all relevant variables. Map them in app code into `createSecureAuth(config)` — the package does not read env.

```bash
# --- App ---
APP_NAME="My App"
APP_SLUG=my-app
APP_BASE_URL=http://localhost:3000
NODE_ENV=development

# --- Database ---
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# --- Auth / NextAuth ---
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-long-random-secret
AUTH_AFTER_LOGIN_PATH=/dashboard
AUTH_AFTER_LOGOUT_PATH=/login
TWO_FACTOR_SECRET_ENCRYPTION_KEY=replace-with-32-byte-base64-key

# --- OAuth (omit provider if credentials empty) ---
AUTH_GOOGLE_CLIENT_ID=
AUTH_GOOGLE_CLIENT_SECRET=
AUTH_APPLE_CLIENT_ID=
AUTH_APPLE_CLIENT_SECRET=
AUTH_MICROSOFT_CLIENT_ID=
AUTH_MICROSOFT_CLIENT_SECRET=
AUTH_MICROSOFT_TENANT_ID=common

# --- WebAuthn / Passkeys ---
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME="My App"
WEBAUTHN_ORIGIN=http://localhost:3000

# --- Email (app-owned transport) ---
EMAIL_FROM="My App <noreply@localhost>"
# App-specific: EMAIL_PROVIDER, SMTP_* if you implement SMTP in EmailProvider

# --- Sessions ---
AUTH_SESSION_MAX_AGE_SECONDS=2592000
AUTH_SESSION_LAST_USED_UPDATE_SECONDS=300
AUTH_SINGLE_ACTIVE_SESSION=false
AUTH_SESSION_REVOCATION_POLL_SECONDS=10

# --- Password policy ---
AUTH_PASSWORD_POLICY_ENFORCEMENT=warn
AUTH_PASSWORD_MIN_LENGTH=12
AUTH_PASSWORD_REQUIRE_UPPERCASE=false
AUTH_PASSWORD_REQUIRE_LOWERCASE=false
AUTH_PASSWORD_REQUIRE_NUMBER=false
AUTH_PASSWORD_REQUIRE_SYMBOL=false
AUTH_PASSWORD_BLOCK_COMMON_PASSWORDS=true
AUTH_PASSWORD_MIN_SCORE=2
AUTH_PASSWORD_STRENGTH_POSITION=above

# --- Email verification ---
EMAIL_VERIFICATION_SEND_ON_REGISTER=true
EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN=false

# --- Rate limiting ---
# Only the STORE is configurable. Policies (windows, max attempts) are fixed in the package.
AUTH_RATE_LIMIT_STORE=memory
# Use postgres in production with multiple instances:
# AUTH_RATE_LIMIT_STORE=postgres

# --- Cookies ---
AUTH_COOKIE_SECURE=

# --- Debug ---
AUTH_TRACE=false
```

### Variables that do NOT configure the package (do not document as functional)

These have **no effect** on `@tgoliveira/secure-auth` behavior today:

- `AUTH_RATE_LIMIT_ENABLED` — rate limiting is always applied where handlers enforce it
- `AUTH_RATE_LIMIT_WINDOW_SECONDS` — fixed per operation in package
- `AUTH_RATE_LIMIT_MAX_REQUESTS` — fixed per operation in package

Implement env parsing with **safe helpers**:

- Booleans: only `"true"` / `"false"`; invalid values should throw at startup
- Numbers: invalid values fall back to defaults; out-of-range clamped
- Enums: invalid values fall back to defaults

Create `src/lib/env/secure-auth-from-env.ts` (app-owned) mapping env → config slices, then spread into `createSecureAuth`.

---

## Phase 4 — EmailProvider

Implement app-owned email delivery:

```typescript
// src/lib/email-provider.ts
import type { EmailProvider } from "@tgoliveira/secure-auth/email";

export const emailProvider: EmailProvider = {
  async send({ to, subject, html, text }) {
    // Wire to console, SMTP, SendGrid, SES, etc.
    // Package owns templates; you own transport.
  },
};
```

Remove local verification/reset email template + send logic **after** the package handles orchestration via `email.provider`.

---

## Phase 5 — Composition root

Create `src/lib/secure-auth.ts`:

```typescript
import "server-only";
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import { db } from "@/lib/db";
import { emailProvider } from "@/lib/email-provider";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";
import { readEnv } from "@/lib/env/parse";

const envConfig = buildSecureAuthConfigFromEnv({
  appName: "My App",
  appSlug: "my-app",
  baseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
});

export const secureAuth = createSecureAuth({
  db,
  ...envConfig,
  email: {
    from: readEnv(process.env, "EMAIL_FROM") ?? `${envConfig.app.name} <noreply@localhost>`,
    provider: emailProvider,
  },
  ui: {
    ...envConfig.ui,
    paths: {
      login: "/login",
      register: "/register",
      forgotPassword: "/forgot-password",
      resetPassword: "/reset-password",
      verifyEmail: "/verify-email",
      checkEmail: "/check-email",
      loginTwoFactor: "/login/2fa",
      loginComplete: "/login/complete",
      account: "/settings/account",
      security: "/settings/security",
      sessions: "/settings/sessions",
      accountDeleted: "/account-deleted",
    },
    messages: {
      loginTitle: "Sign in to My App",
      registerTitle: "Create your account",
      // ... other copy overrides
    },
  },
});
```

Adjust `ui.paths` to match your app's route structure.

Verify health endpoint after wiring:

```bash
curl http://localhost:3000/api/auth/package-health
# Expect: { "ok": true, "package": "@tgoliveira/secure-auth", "version": "0.1.11-internal" }
```

(If you mount health at a different path, use `secureAuth.routes.health.GET` accordingly.)

---

## Phase 6 — Replace API routes with thin wrappers

Delete local auth handler **logic**. Keep only thin `route.ts` files that re-export package handlers.

### Route key → typical App Router path

| `secureAuth.routes` key | HTTP | Suggested path |
| --- | --- | --- |
| `health` | GET | `/api/auth/package-health` |
| `register` | POST | `/api/auth/register` |
| `forgotPassword` | POST | `/api/auth/forgot-password` |
| `resetPassword` | POST | `/api/auth/reset-password` |
| `verifyEmailConfirm` | POST | `/api/auth/verify-email/confirm` |
| `verifyEmailResend` | POST | `/api/auth/verify-email/resend` |
| `loginStart` | POST | `/api/auth/login/start` |
| `loginComplete` | POST | `/api/auth/login/complete` |
| `loginStartForm` | POST | `/api/auth/login/start-form` |
| `loginVerify2fa` | POST | `/api/auth/login/verify-2fa` |
| `loginVerify2faForm` | POST | `/api/auth/login/verify-2fa-form` |
| `loginVerify2faOauth` | POST | `/api/auth/login/verify-2fa-oauth` |
| `loginChallengeStatus` | GET | `/api/auth/login/challenge-status` |
| `loginTrace` | GET | `/api/auth/login/trace` (debug; optional) |
| `passkeyLoginOptions` | POST | `/api/auth/passkey/login/options` |
| `passkeyLoginVerify` | POST | `/api/auth/passkey/login/verify` |
| `passwordPolicy` | GET | `/api/auth/password-policy` |
| `nextAuth` | GET, POST | `/api/auth/[...nextauth]` |
| `account` | GET, DELETE | `/api/account` |
| `accountAuthStatus` | GET | `/api/account/auth-status` |
| `changePassword` | POST | `/api/account/change-password` |
| `passkeysList` | GET | `/api/account/passkeys` |
| `passkeyRegister` | POST | `/api/account/passkeys/register` |
| `passkeyById` | DELETE | `/api/account/passkeys/[id]` |
| `twoFactorStatus` | GET | `/api/account/2fa/status` |
| `twoFactorSetupStart` | POST | `/api/account/2fa/setup/start` |
| `twoFactorSetupVerify` | POST | `/api/account/2fa/setup/verify` |
| `twoFactorDisable` | POST | `/api/account/2fa/disable` |
| `twoFactorBackupCodesRegenerate` | POST | `/api/account/2fa/backup-codes/regenerate` |
| `sessionsList` | GET | `/api/account/sessions` |
| `sessionById` | DELETE | `/api/account/sessions/[id]` |
| `sessionsPing` | POST | `/api/account/sessions/ping` |
| `sessionsRevokeCurrent` | POST | `/api/account/sessions/revoke-current` |
| `sessionsRevokeOthers` | POST | `/api/account/sessions/revoke-others` |
| `sessionsRevokeAll` | POST | `/api/account/sessions/revoke-all` |

### Wrapper pattern

```typescript
// src/app/api/auth/register/route.ts
import { secureAuth } from "@/lib/secure-auth";

export const POST = secureAuth.routes.register.POST;
```

```typescript
// src/app/api/account/passkeys/[id]/route.ts
import { secureAuth } from "@/lib/secure-auth";

export const DELETE = secureAuth.routes.passkeyById.DELETE;
```

### NextAuth route

**Option A (minimal):**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { secureAuth } from "@/lib/secure-auth";

export const GET = secureAuth.routes.nextAuth.GET;
export const POST = secureAuth.routes.nextAuth.POST;
```

**Option B (explicit helper):**

```typescript
import NextAuth from "next-auth";
import { createNextAuthRouteHandlers } from "@tgoliveira/secure-auth/next";
import { secureAuth } from "@/lib/secure-auth";

export const { GET, POST } = createNextAuthRouteHandlers(NextAuth, secureAuth.getServices);
```

OAuth callback URLs in provider consoles must be:

```text
{APP_BASE_URL}/api/auth/callback/google
{APP_BASE_URL}/api/auth/callback/apple
{APP_BASE_URL}/api/auth/callback/azure-ad
```

Remove all replaced local API route implementations.

---

## Phase 7 — Replace pages with package components

Use ready-to-use pages from `@tgoliveira/secure-auth/react` as **thin wrappers**. Do not recreate login/register/settings UI unless you document a product-specific reason.

| Package export | Typical route |
| --- | --- |
| `LoginPage` | `/login` |
| `RegisterPage` | `/register` |
| `ForgotPasswordPage` | `/forgot-password` |
| `ResetPasswordPage` | `/reset-password` |
| `CheckEmailPage` | `/check-email` |
| `VerifyEmailPage` | `/verify-email` |
| `LoginTwoFactorPage` | `/login/2fa` |
| `LoginCompletePage` | `/login/complete` |
| `AccountSettingsPage` | `/settings/account` |
| `SecuritySettingsPage` | `/settings/security` |
| `SessionsSettingsPage` | `/settings/sessions` |
| `AccountDeletedPage` | `/account-deleted` |
| `DashboardPlaceholderPage` | `/dashboard` (optional placeholder) |

### Thin re-export (default)

```typescript
// src/app/login/page.tsx
export { LoginPage as default } from "@tgoliveira/secure-auth/react";
```

### Per-page customization (when needed)

```typescript
import { LoginPage } from "@tgoliveira/secure-auth/react";

export default function Page() {
  return <LoginPage title="Sign in to My App" />;
}
```

**UI precedence:** page props → `SecureAuthUIProvider` → package defaults.

**RSC note:** Package pages are client components. If `next build` fails with Server Component boundary errors on thin re-exports, add a local `"use client"` wrapper that renders the package page — document the fix in your migration report.

Remove replaced local auth page components and forms.

---

## Phase 8 — UI provider, session provider, styles

### Providers

```tsx
// src/components/providers.tsx
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
  const refetchInterval = uiConfig.sessionPolicy.revocationPollIntervalSeconds;

  return (
    <SessionProvider refetchInterval={refetchInterval > 0 ? refetchInterval : undefined}>
      <SecureAuthUIProvider config={uiConfig}>{children}</SecureAuthUIProvider>
    </SessionProvider>
  );
}
```

```tsx
// src/app/layout.tsx
import { Providers } from "@/components/providers";
import { secureAuth } from "@/lib/secure-auth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers uiConfig={secureAuth.uiConfig}>{children}</Providers>
      </body>
    </html>
  );
}
```

### Single active session (if enabled)

When `AUTH_SINGLE_ACTIVE_SESSION=true`, mount the monitor from the package in your layout or providers:

```tsx
import { SingleActiveSessionMonitor } from "@tgoliveira/secure-auth/react";
// Render inside SecureAuthUIProvider when uiConfig.sessionPolicy.singleActiveSession is true
```

### Styles

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "@tgoliveira/secure-auth/styles.css";

:root {
  /* Define theme tokens used by package UI — see your app design system */
  --background: ...;
  --foreground: ...;
  --primary: ...;
  --card: ...;
  /* etc. */
}
```

Requires **Tailwind CSS v4** with `@import "tailwindcss"`.

---

## Phase 9 — Middleware and app-specific authorization

Adapt **app** middleware to package sessions:

- Use NextAuth `getServerSession` / `auth()` patterns consistent with your existing middleware
- Package account sessions are enforced server-side in route handlers; app middleware should gate **product routes** (dashboard, admin, billing)
- Remove middleware that duplicated package auth checks (login rate limits, token validation now in package routes)

Document which middleware rules remain app-owned in `docs/migrations/secure-auth-middleware.md`.

---

## Phase 10 — Remove old local auth code

After routes and pages are wired and tests pass, delete:

- Local auth services, repositories, password hashers (if fully replaced)
- Local auth API route implementations (keep thin wrappers only)
- Local login/register/reset/settings UI components replaced by package pages
- Duplicate Drizzle auth schema definitions and obsolete SQL migrations
- Local password policy, 2FA, passkey, session modules now provided by package
- Unused auth dependencies (only remove after confirming package covers the flow)

Run ripgrep to confirm nothing imports removed modules:

```bash
rg "from \"@/modules/auth" src/
rg "from \"@/lib/auth" src/
```

Keep app-specific authorization, domain models, and non-auth features.

---

## Phase 11 — Tests and import boundary checks

Add or update tests:

### 1. Import boundary test

Fail if forbidden imports exist:

```typescript
// src/test/import-boundaries.test.ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const FORBIDDEN = [
  "@tgoliveira/secure-auth/server",
  "createRoutes",
  "createAuthServices",
  "createRouteHandlers",
];

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(path, files);
    } else if (/\.(ts|tsx)$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

describe("secure-auth import boundaries", () => {
  it("does not import forbidden package APIs", () => {
    const srcFiles = walk(join(process.cwd(), "src"));
    const violations: string[] = [];
    for (const file of srcFiles) {
      const content = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        if (content.includes(pattern)) violations.push(`${file}: ${pattern}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
```

### 2. Env mapping tests

Test `buildSecureAuthConfigFromEnv` for booleans, password policy, single active session.

### 3. Smoke tests

- Health route returns package version
- Register → (verify email) → login flow
- Password policy GET matches config

Remove or rewrite tests that targeted deleted local auth modules.

---

## Phase 12 — Deployment readiness

Create `docs/migrations/secure-auth-deployment-checklist.md` covering:

### Required production env

- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET` (strong random)
- [ ] `TWO_FACTOR_SECRET_ENCRYPTION_KEY` (32-byte base64)
- [ ] `APP_BASE_URL` / `NEXTAUTH_URL` match deployed URL
- [ ] `EMAIL_FROM` + working `EmailProvider` (not console)
- [ ] `AUTH_COOKIE_SECURE=true` (or production default)
- [ ] `AUTH_RATE_LIMIT_STORE=postgres` if running multiple instances

### OAuth

- [ ] Provider redirect URIs match `{APP_BASE_URL}/api/auth/callback/{provider}`
- [ ] Microsoft: Web platform redirect URI, correct tenant

### WebAuthn

- [ ] `WEBAUTHN_ORIGIN` matches browser URL exactly (no `127.0.0.1` vs `localhost` mismatch)
- [ ] `WEBAUTHN_RP_ID` correct for production domain

### Database

- [ ] Package migrations applied in CI/CD before deploy
- [ ] Backup taken before first production migration from local auth schema

### Build

- [ ] `npm run build` passes
- [ ] `npm run start` serves auth pages
- [ ] `npm audit --audit-level=high` passes (recommended)

---

## Phase 13 — Documentation deliverables

Create these files in the **client repo**:

| File | Contents |
| --- | --- |
| `docs/migrations/secure-auth-inventory.md` | Phase 0 inventory |
| `docs/migrations/secure-auth-db-plan.md` | Schema/migration strategy |
| `docs/migrations/secure-auth-deployment-checklist.md` | Phase 12 checklist |
| `docs/migrations/secure-auth-middleware.md` | App vs package auth boundaries |
| `docs/migrations/secure-auth-migration-report.md` | **Final report** — what changed, what was removed, known gaps, manual QA done |

Update client `README.md` with:

- New env vars
- `npm run db:migrate` instructions
- Link to package health endpoint
- Note that auth is provided by `@tgoliveira/secure-auth@0.1.11-internal`

---

## Phase 14 — Final validation (must all pass)

Run and fix until green:

```bash
npm install
npm run db:migrate          # or your migrate script
npm run build
npm run typecheck           # if configured
npm run lint                # if configured
npm run test
npm audit --audit-level=high
```

Manual QA checklist:

- [ ] Register new account
- [ ] Email verification (if enabled)
- [ ] Login with password
- [ ] Forgot / reset password
- [ ] OAuth sign-in (each configured provider)
- [ ] Passkey register + login (if used)
- [ ] 2FA setup + login with TOTP (if used)
- [ ] Session list + revoke
- [ ] Change password
- [ ] Account deletion
- [ ] Single active session (if enabled) — second browser signed out

Record results in `docs/migrations/secure-auth-migration-report.md`.

---

## Customization reference (no forking)

| Need | Approach |
| --- | --- |
| Copy / paths | `createSecureAuth({ ui: { paths, messages } })` |
| Global UI defaults | `SecureAuthUIProvider config={secureAuth.uiConfig}` |
| One-off page copy | Props on `LoginPage`, etc. |
| Password rules | `passwordPolicy` in config + env mapping |
| Strength field position | `ui.passwordStrength.position` or page prop |
| Email content | Optional `email.templates` in config |
| Brand colors | CSS variables in `globals.css` |
| Single session policy | `sessions.singleActiveSession` + monitor component |

---

## Explicit removals checklist

Confirm deleted or fully replaced:

- [ ] Local `/api/auth/*` handler bodies
- [ ] Local `/api/account/*` handler bodies (auth-related)
- [ ] Local auth Drizzle tables / duplicate schema
- [ ] Local password policy module (use package + config)
- [ ] Local session store logic replaced by package `account_sessions`
- [ ] Local 2FA/passkey implementations
- [ ] Local auth React forms/pages listed in Phase 7
- [ ] Forbidden package imports (Phase 11 test)

---

## Success criteria

Migration is complete when:

1. All auth API routes are thin `secureAuth.routes.*` wrappers.
2. Auth/account/security pages use package components (or documented exceptions).
3. `createSecureAuth` is the only auth composition root.
4. `EmailProvider` is app-implemented and wired.
5. Package migrations applied; no duplicate auth schema.
6. Old local auth code removed.
7. Import boundary tests pass.
8. Build, test, and migrate scripts pass.
9. Deployment checklist and migration report written.
10. Team understands package is **experimental 0.1.x** — schedule security review before production.

---

## If blocked

Document blockers in `docs/migrations/secure-auth-migration-report.md`:

- **Existing user data shape incompatible** — need custom SQL migration
- **Custom auth UX requirement** — justify keeping a local page vs package page
- **Non-PostgreSQL database** — package not supported; stop migration
- **NextAuth v5 requirement** — package targets v4 today; migration out of scope

Do not import package internals or monorepo source as a workaround.

---

**End of migration prompt.**
