# Article brief: `@tgoliveira/secure-auth`

**Purpose:** Context for a public technical article. Grounded in the current codebase and docs as of **`0.1.11-internal`** (2026-06-16).  
**Audience:** Developers and technical leads using Next.js App Router, TypeScript, PostgreSQL, Drizzle ORM, and modern account authentication.

---

## 1. Executive summary

`@tgoliveira/secure-auth` is an **opinionated, experimental** authentication package for **Next.js App Router + Drizzle ORM + PostgreSQL**. It packages account authentication—credentials, OAuth (via NextAuth v4), passkeys (WebAuthn), TOTP 2FA, sessions, email verification, password reset, and account management—behind a single composition root: **`createSecureAuth(config)`**.

Consumers own infrastructure (database connection, secrets, email transport, environment mapping). The package owns the auth domain (schema, migrations, services, API route handlers, and optional ready-made UI pages). Integration is intentionally thin: one bootstrap file, one-line API route wrappers, optional one-line page wrappers, and a root layout wired with `SecureAuthUIProvider`.

The package is **published publicly on npm** (MIT license) but versioned and labeled as an **internal experimental release** (`0.1.x-internal`). It is **functional and worth understanding** if your stack matches, but **not a stable 1.0 production contract** yet. Security improvements and dependency hygiene are actively maintained; architectural and API evolution should still be expected.

---

## 2. Elevator pitch

**One paragraph:**  
Rebuilding authentication in every Next.js app repeats the same expensive work—schema design, session tables, OAuth wiring, 2FA, passkeys, rate limits, audit events, and account UI. `@tgoliveira/secure-auth` extracts that work into a reusable package with a single integration point (`createSecureAuth`), explicit dependency injection, and clear ownership boundaries: your app supplies the database and secrets; the package supplies the auth system.

**One sentence:**  
An opinionated auth foundation for Next.js + PostgreSQL teams who want product-ready account flows without copying auth code into every repository.

---

## 3. Problem statement

### The real cost of rebuilding authentication

Every new Next.js product that needs “real” account auth tends to re-implement overlapping concerns:

| Area | Repeated work |
| --- | --- |
| **Credentials** | Register, login, password hashing, reset, change password |
| **OAuth** | Provider config, callbacks, account linking, error surfaces |
| **Passkeys** | WebAuthn registration, login challenges, credential storage |
| **2FA** | TOTP setup, backup codes, step-up during login |
| **Sessions** | Server-side session rows, revocation, device metadata, optional single-session policy |
| **Email flows** | Verification, reset links, resend throttling |
| **Security plumbing** | Rate limiting, audit events, token hashing, safe logging |
| **Database** | Auth schema, migrations, Drizzle models |
| **UI** | Login, register, settings, 2FA, passkeys, sessions |

Each re-implementation drifts. Security fixes do not propagate. UI and policy behavior diverge across apps. Onboarding a new project means weeks of auth work before product features.

### What this package tries to solve

Centralize that repeated work into one package so that:

- security-sensitive logic is maintained in one place;
- consumers integrate through a documented public API;
- apps focus on product-specific code (marketing, domain features, billing, etc.);
- teams with multiple Next.js + PostgreSQL apps get a **reusable baseline**, not a copy-paste starter.

---

## 4. Why it exists

### Motivation (from project architecture and changelog)

1. **A starter app was not enough.** An integration harness (`apps/dev-harness`) proved the flows, but copying starter code into each new project still duplicated maintenance.
2. **Package-first architecture (0.1.x).** Auth logic moved into `@tgoliveira/secure-auth`; apps became thin consumers (`0.1.4-internal` removed legacy `@tgoliveira/secure-auth/server` and deep server imports).
3. **Centralize security improvements.** Dependency audits, password policy fixes, and session policy changes ship once in the package.
4. **Explicit boundaries.** The package does not read `process.env`; consumers map environment at the app boundary. That keeps secrets and deployment concerns in application code.
5. **Validation path.** `apps/consumer-demo` exists to prove a minimal new app can integrate using **public exports only**—no starter code, no deep imports.

This is a **reusable internal-style foundation**, not a claim to replace every auth system in the ecosystem.

---

## 5. Target audience

### Ideal users

| Profile | Why it fits |
| --- | --- |
| **Developers building multiple Next.js apps** | Amortize auth investment across projects |
| **Small SaaS / B2B products** | Need full account flows without a dedicated auth team |
| **Internal tools with real accounts** | Want sessions, OAuth, and optional 2FA without bespoke code |
| **Engineering leads** | Prefer an opinionated baseline over ad-hoc auth per repo |
| **Teams already on PostgreSQL + Drizzle** | Schema and migrations align with the stack |
| **Teams comfortable configuring NextAuth** | OAuth layer builds on NextAuth v4, not a from-scratch OAuth server |

### Non-target audience

| Profile | Why it may not fit |
| --- | --- |
| **Non-Next.js stacks** | Tied to Next.js App Router route handlers and React UI |
| **Non-PostgreSQL databases** | Drizzle schema and migrations are PostgreSQL-oriented |
| **Prisma / other ORMs** | Not supported; Drizzle is a peer dependency |
| **Auth.js v5 / custom session-only needs** | Built around NextAuth v4 patterns today |
| **Teams needing framework-agnostic auth** | Opinionated by design |
| **Production without security review** | Still `0.1.x-internal`; explicit non-production-ready label |
| **Products needing only social login** | Full package may be heavier than necessary |
| **Highly custom auth UX** | Ready-made pages help, but deep UX divergence may fight the defaults |

---

## 6. Package capabilities (concrete)

### Composition and API

| Capability | Detail |
| --- | --- |
| **`createSecureAuth(config)`** | Sole public composition root (`@tgoliveira/secure-auth/next`) |
| **`secureAuth.routes.*`** | App Router handlers for ~35 auth/account API routes |
| **`secureAuth.uiConfig`** | Serializable UI defaults for `SecureAuthUIProvider` |
| **`secureAuth.getServices()`** | Lazy service access (e.g. NextAuth handler wiring) |

### Authentication methods

- Email/password (register, login, forgot/reset, change password)
- OAuth via **NextAuth v4** (Google, Apple, Microsoft/Azure AD)
- **Passkeys** (WebAuthn via `@simplewebauthn`)
- **TOTP 2FA** with backup codes (encrypted secrets at rest)

### Account and session management

- Email verification (optional gate before sign-in)
- Session list, ping, revoke current/others/all
- Optional **single active session** (`sessions.singleActiveSession`)
- Account deletion with confirmation and re-auth safeguards

### Security controls

- **Password policy** (length, symbols, numbers, common-password block, `off` / `warn` / `enforce`)
- **Rate limiting** (memory or PostgreSQL store; per-operation policies)
- **Audit events** (sanitized metadata; internal repository)
- **Token handling** (hashed at rest, single-use, time-limited)
- **`safeLogger`** with redaction patterns
- Account enumeration avoided in API responses (documented intent)

### Data layer

- **`authSchema`** export (`@tgoliveira/secure-auth/drizzle/schema`)
- SQL migrations shipped in package `migrations/`
- Tables include: users, account sessions, tokens, passkeys, WebAuthn challenges, rate limits, 2FA settings, audit events

### UI layer

- **`SecureAuthUIProvider`** + `useSecureAuthUi()`
- Ready-to-use pages: `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage`, settings pages, etc.
- Feature components: credentials forms, social sign-in, passkey settings, 2FA settings, session cards
- **`@tgoliveira/secure-auth/styles.css`** for Tailwind v4 integration
- Per-page props override provider defaults

### Email

- **`EmailProvider` interface** (`@tgoliveira/secure-auth/email`) — app implements `send()`
- Package owns template structure and send orchestration; **not** SMTP/console transport

### Publishing and validation

- Public npm package (MIT)
- GitHub Actions publish on tag `secure-auth-v0.1.*-internal`
- Pre-publish: `npm run audit:security`, build, typecheck, lint, test
- In-repo **consumer-demo** validation app

### Explicitly not provided

- Vault/domain encryption, encrypted letter storage, or product-specific cryptography
- Email transport (SMTP, SendGrid, etc.)—consumer implements
- Marketing pages, app shell, billing, or non-auth product features
- Guaranteed production-ready security contract at `0.1.x`

---

## 7. Integration model

### What the consumer app provides

```text
┌─────────────────────────────────────────────────────────┐
│ Consumer app (your Next.js project)                      │
├─────────────────────────────────────────────────────────┤
│ • PostgreSQL + Drizzle client (db)                       │
│ • Env → SecureAuthConfig mapping (app-owned helper)      │
│ • EmailProvider implementation (console, SMTP, etc.)     │
│ • OAuth/WebAuthn secrets via config                      │
│ • Thin API route files: export secureAuth.routes.*       │
│ • Thin page files: export LoginPage, etc. (optional)     │
│ • Root layout: SecureAuthUIProvider + SessionProvider    │
│ • globals.css: @import package styles                    │
│ • Run package migrations against your database           │
└─────────────────────────────────────────────────────────┘
```

### What the package provides

```text
┌─────────────────────────────────────────────────────────┐
│ @tgoliveira/secure-auth                                  │
├─────────────────────────────────────────────────────────┤
│ • createSecureAuth(config)                               │
│ • Route handler implementations (secureAuth.routes)      │
│ • Auth services, repositories, policies                  │
│ • Drizzle authSchema + migrations                        │
│ • Default UI pages, forms, settings surfaces             │
│ • uiConfig derived from config (paths, messages, policy) │
└─────────────────────────────────────────────────────────┘
```

### Minimal conceptual flow

```typescript
// 1. App bootstrap (server-only)
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import { db } from "@/lib/db";
import { emailProvider } from "@/lib/email-provider";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";

export const secureAuth = createSecureAuth({
  db,
  ...buildSecureAuthConfigFromEnv({ appName: "My App", appSlug: "my-app", baseUrl: "..." }),
  email: { from: "My App <noreply@example.com>", provider: emailProvider },
});

// 2. API route (thin wrapper)
// app/api/auth/register/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.register.POST;

// 3. Page (thin wrapper)
// app/login/page.tsx
export { LoginPage as default } from "@tgoliveira/secure-auth/react";

// 4. Layout
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import { secureAuth } from "@/lib/secure-auth";

<SecureAuthUIProvider config={secureAuth.uiConfig}>{children}</SecureAuthUIProvider>
```

### Reference consumers in the monorepo

| App | Role |
| --- | --- |
| **`apps/dev-harness`** | Feature-rich reference: SMTP email module, OpenAPI/Swagger, route groups, broader tests |
| **`apps/consumer-demo`** | Minimal validation: console email, public exports only, intentional UI prop override demos |

Both follow the same contract; consumer-demo proves the minimum viable integration.

---

## 8. Why not just use NextAuth directly?

**Be fair:** NextAuth (v4) is excellent at OAuth provider integration, session/JWT handling, and the `[...nextauth]` route pattern. Many apps stop there and build the rest ad hoc.

**This package adds a product-ready layer on top of that stack:**

| Layer | NextAuth alone | + `@tgoliveira/secure-auth` |
| --- | --- | --- |
| OAuth providers | ✓ | ✓ (via `secureAuth.routes.nextAuth`) |
| Credentials + email verification | Custom | ✓ |
| Passkeys | Custom | ✓ |
| TOTP 2FA + backup codes | Custom | ✓ |
| Account sessions table + revocation UI | Custom | ✓ |
| Password policy + strength UI | Custom | ✓ |
| Rate limiting + audit events | Custom | ✓ |
| Drizzle schema + migrations | Custom | ✓ |
| Ready-made account pages | Custom | ✓ (optional) |
| Single config object | Scattered | `createSecureAuth(config)` |

**Distinction in one line:** NextAuth handles provider/session primitives; this package ships an **opinionated account system** (policies, pages, schema, routes) around that foundation for a specific stack.

**Not a criticism:** Teams that only need Google login and a JWT may not need this package. Teams repeatedly building full account centers on Next.js + PostgreSQL may.

---

## 9. Architecture overview

### Package-first model (current — not starter-first)

```text
packages/secure-auth/     ← product
apps/dev-harness/             ← reference consumer (feature-rich)
apps/consumer-demo/       ← minimal validation consumer
docs/                     ← architecture, security, consumer guides
```

### Design principles

1. **Opinionated, not generic** — Next.js + Drizzle + PostgreSQL only.
2. **One public package** — no deep `src/**` imports; internal modules are not API.
3. **App owns infrastructure** — DB, OAuth secrets, email transport, env mapping.
4. **Package owns auth domain** — schema, migrations, services, handlers, default UI.
5. **Configure once** — `createSecureAuth(config)` is the sole composition root.

### Dependency injection

- Services receive `config` and `db` through factories—**no global runtime state**.
- Package **never reads `process.env`**; apps map env at bootstrap (`buildSecureAuthConfigFromEnv` in consumers is app-owned, not exported).
- `EmailProvider.send()` is injected; package calls it from template delivery code.

### Public API boundaries (supported)

| Entry | Use |
| --- | --- |
| `@tgoliveira/secure-auth` | Types, `authSchema`, `SECURE_AUTH_PACKAGE_VERSION`, `safeLogger` |
| `@tgoliveira/secure-auth/next` | **`createSecureAuth`**, `createNextAuthRouteHandlers` |
| `@tgoliveira/secure-auth/react` | Pages, provider, UI primitives |
| `@tgoliveira/secure-auth/react/client` | Client-only helpers (passkey sign-in, confirm dialog) |
| `@tgoliveira/secure-auth/client` | Browser API clients |
| `@tgoliveira/secure-auth/client/password-policy` | Client-side password assessment |
| `@tgoliveira/secure-auth/drizzle/schema` | `authSchema` |
| `@tgoliveira/secure-auth/email` | `EmailProvider` type |
| `@tgoliveira/secure-auth/styles.css` | Tailwind v4 styles |

### Removed / unsupported (do not mention as current API)

- `@tgoliveira/secure-auth/server` — **removed** (`0.1.4-internal`)
- `createRoutes`, `createAuthServices` — **internal**; use `secureAuth.routes.*`
- `createRouteHandlers` — **removed** (legacy stubs)
- Deep imports from `packages/secure-auth/src/**`

---

## 10. Security model

### Scope (non-negotiable)

**Account authentication only.** No vault unlock, encrypted letter storage, or encryption-key derivation from passkeys/TOTP.

### Principles present in the implementation

| Control | Implementation notes |
| --- | --- |
| **Password hashing** | bcrypt |
| **Password policy** | Configurable; default `minLength: 12`, `enforcement: "warn"` |
| **2FA** | TOTP + backup codes; secrets encrypted with `auth.twoFactorEncryptionKey` |
| **Passkeys** | WebAuthn challenges; origin/RP ID from config |
| **Sessions** | Server-side rows; hashed IP/UA; revocation APIs |
| **Single active session** | Opt-in; client monitor polls for revocation |
| **Rate limiting** | Per-operation policies; memory or Postgres store |
| **Audit logging** | `audit_events` table; sanitized metadata |
| **Token safety** | Hashed at rest; single-use; time-limited |
| **Logging** | `safeLogger`; no credential/token logging |
| **Dependency audit** | `npm run audit:security`; CI gate before publish |
| **Account deletion** | Confirmation phrase + re-auth; OAuth-only uses session-bound window |

### What security does not mean here

- **Not “guaranteed secure.”** Experimental release; human security review still required before production.
- **Not “zero config.”** Consumers must supply secrets, correct WebAuthn origins, and a real `EmailProvider`.
- **Not universal compliance.** No SOC2/HIPAA claims in docs.

---

## 11. Customization model

### Configuration layers

| Layer | Mechanism | Examples |
| --- | --- | --- |
| **Server config** | `createSecureAuth({ ... })` | `passwordPolicy`, `sessions`, `oauth`, `webauthn`, `ui.paths`, `ui.messages` |
| **Env mapping** | App-owned `buildSecureAuthConfigFromEnv()` | `AUTH_PASSWORD_MIN_LENGTH`, `AUTH_SINGLE_ACTIVE_SESSION`, OAuth vars |
| **UI provider** | `SecureAuthUIProvider config={secureAuth.uiConfig}` | Default copy, paths, password strength position |
| **Per-page override** | Props on page components | `LoginPage title="..."`, `ResetPasswordPage passwordStrengthPosition="below"` |
| **Email** | `EmailProvider` implementation | Console, SMTP, SendGrid adapter in app |
| **Theme** | CSS variables + `styles.css` import | Brand colors via `:root` tokens |
| **Templates** | Optional `email.templates` in config | Customize verification/reset copy |

### Precedence (UI)

```text
Page prop  →  SecureAuthUIProvider  →  package default
```

Demonstrated in `apps/consumer-demo` on `/login` and `/reset-password`.

### What not to customize by forking

- Core auth schema tables (extend with separate tables if needed)
- Password hashing algorithm parameters
- Internal rate-limit key semantics

---

## 12. Trade-offs

| Trade-off | Honest assessment |
| --- | --- |
| **Opinionated stack** | Fast path for Next.js + Drizzle + PostgreSQL; wrong tool for other stacks |
| **More abstraction** | Less code in your app, more to learn in the package API |
| **Thin wrappers required** | ~35 API routes and ~13 pages to mount (mechanical, but not zero) |
| **NextAuth v4 coupling** | OAuth builds on v4; Auth.js v5 migration would be a future project |
| **Experimental versioning** | `0.1.x-internal`; breaking DB/API changes still possible |
| **Env mapping in app** | Explicit and testable, but boilerplate vs magic-env packages |
| **Email in app** | Flexibility + responsibility; no built-in SMTP |
| **Default in-memory rate limit** | Must switch to Postgres store for multi-instance production |
| **Ready-made UI** | Fast to ship; highly bespoke design systems may override heavily |
| **RSC integration caveat** | Thin page re-exports from `@tgoliveira/secure-auth/react` may need `"use client"` boundaries in some Next.js builds—verify in your app |
| **Docs lag** | Some consumer guides still cite older versions/install paths; verify against `0.1.11-internal` |

---

## 13. Maturity and caveats

### Current status (`0.1.11-internal`)

| Signal | State |
| --- | --- |
| **npm** | Published publicly (MIT) |
| **Version label** | `0.1.x-internal` — experimental |
| **README / security docs** | Explicitly **not production-ready** |
| **Consumer validation** | `apps/consumer-demo` passes build/typecheck/test/migrate with public exports only |
| **Test coverage target** | ≥ 95% statements/lines/functions/branches |
| **Dependency audit** | Clean at last release; CI blocks high/critical on publish |
| **OAuth E2E in CI** | Limited; manual provider validation still needed |
| **Package ESLint** | Not configured until `0.2.x` (lint script is a placeholder) |

### Versioning roadmap (from docs)

| Range | Meaning |
| --- | --- |
| `0.1.x` | Experimental; breaking changes allowed |
| `0.2.x` | Documented breaking migrations; API stabilization |
| `1.0.0` | Production-ready contract (multiple gates still open) |

### 1.0.0 gates still open (from `docs/security.md`)

- OAuth-only account deletion policy fully implemented/tested
- Security review sign-off documented
- (Other items largely met: composition root, no package env reads, EmailProvider, audit policy)

### Honest positioning for the article

Use phrasing like:

- “opinionated baseline”
- “reusable foundation”
- “early but functional”
- “worth evaluating if your stack matches”
- “controlled experimental release”

Avoid:

- “production-ready”
- “replaces all auth systems”
- “framework-agnostic”
- “security guaranteed”

---

## 14. Suggested article outline

1. **The real cost of rebuilding authentication** — repeated schema, OAuth, 2FA, passkeys, sessions, UI in every Next.js app.
2. **Why a starter app was not enough** — integration harness vs reusable package; maintenance across repos.
3. **Turning auth into a package** — from `apps/dev-harness` to `@tgoliveira/secure-auth`; what moved, what stayed in apps.
4. **The package-first architecture** — `createSecureAuth(config)` as sole composition root; public export map.
5. **What the consumer app still owns** — DB, secrets, email, env mapping, route/page wrappers.
6. **What the package provides** — routes, pages, schema, policies, security controls.
7. **Handling UI without locking consumers in** — `uiConfig`, provider, per-page props, styles import.
8. **Security and session policies** — password policy, 2FA, passkeys, rate limits, single active session, audit.
9. **Publishing and validating the package** — npm release, consumer-demo, audit gate, experimental label.
10. **Where this approach works well** — multiple Next.js products, small SaaS, internal tools on PostgreSQL.
11. **Where it may not fit** — wrong stack, minimal OAuth-only needs, production without review.
12. **What comes next** — path to `0.2.x` / `1.0.0`, Auth.js v5 consideration, OAuth E2E, RSC boundary polish.

---

## 15. Suggested titles

1. **Building an Opinionated Auth Package for Next.js and PostgreSQL**
2. **Why I Extracted Authentication Into a Reusable npm Package**
3. **From Starter App to Package: Reusable Account Auth for Next.js**
4. **What NextAuth Does Not Ship—and When to Add a Product Auth Layer**
5. **An Honest Look at Packaging Auth for the Next.js + Drizzle Stack**

---

## 16. Key code snippets (article-ready)

### 1. Installing the package

```bash
npm install @tgoliveira/secure-auth@0.1.11-internal \
  drizzle-orm postgres next next-auth react react-dom
```

Peers: `next@^16`, `react@^19`, `next-auth@^4.24`, `drizzle-orm@^0.45.2`. Consumer supplies `postgres` driver and database.

### 2. Creating `secureAuth`

```typescript
import "server-only";
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import { db } from "@/lib/db";

export const secureAuth = createSecureAuth({
  db,
  app: { name: "My App", slug: "my-app", baseUrl: process.env.APP_BASE_URL! },
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    twoFactorEncryptionKey: process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY!,
    afterLoginPath: "/dashboard",
  },
  email: { from: "My App <noreply@example.com>", provider: myEmailProvider },
});
```

### 3. Providing `EmailProvider`

```typescript
import type { EmailProvider } from "@tgoliveira/secure-auth/email";

export const consoleEmailProvider: EmailProvider = {
  async send({ to, subject, html, text }) {
    console.info("[email]", { to, subject, text: text ?? html });
  },
};
```

### 4. Creating a route wrapper

```typescript
// app/api/auth/register/route.ts
import { secureAuth } from "@/lib/secure-auth";

export const POST = secureAuth.routes.register.POST;
```

### 5. Creating a page wrapper

```typescript
// app/login/page.tsx
export { LoginPage as default } from "@tgoliveira/secure-auth/react";
```

With optional override:

```typescript
import { LoginPage } from "@tgoliveira/secure-auth/react";

export default function Page() {
  return <LoginPage title="Sign in to My App" />;
}
```

### 6. Using `SecureAuthUIProvider`

```tsx
// app/layout.tsx
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import { secureAuth } from "@/lib/secure-auth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SecureAuthUIProvider config={secureAuth.uiConfig}>
          {children}
        </SecureAuthUIProvider>
      </body>
    </html>
  );
}
```

### 7. Setting password policy

```typescript
createSecureAuth({
  // ...
  passwordPolicy: {
    minLength: 12,
    enforcement: "warn", // "off" | "warn" | "enforce"
    requireSymbol: true,
    blockCommonPasswords: true,
  },
});
```

### 8. Enabling single active session

```typescript
createSecureAuth({
  // ...
  sessions: {
    singleActiveSession: true,
    revocationPollIntervalSeconds: 10,
  },
});
```

Mount `SingleActiveSessionMonitor` from `@tgoliveira/secure-auth/react` in the app layout when enabled.

### Styles import (bonus)

```css
/* app/globals.css */
@import "tailwindcss";
@import "@tgoliveira/secure-auth/styles.css";
```

---

## 17. Key diagrams (describe in text for illustrator / Mermaid)

### Diagram A: Ownership boundary

```text
┌──────────────────────┐         ┌─────────────────────────────┐
│   Consumer app       │         │  @tgoliveira/secure-auth    │
│                      │         │                             │
│  PostgreSQL + Drizzle│──db────▶│  Services & repositories    │
│  .env → config       │─config─▶│  createSecureAuth           │
│  EmailProvider       │─email──▶│  Templates → provider.send  │
│  route.ts wrappers   │─calls──▶│  secureAuth.routes.*        │
│  page.tsx wrappers   │─renders▶│  LoginPage, RegisterPage…   │
│  SecureAuthUIProvider│◀uiConfig│  buildPublicUIConfig        │
└──────────────────────┘         └─────────────────────────────┘
```

### Diagram B: Request flow (register example)

```text
Browser POST /api/auth/register
  → app/api/auth/register/route.ts (thin export)
  → secureAuth.routes.register.POST
  → internal handler → registerService
  → rate limit check → password policy → user repository
  → optional verification email via EmailProvider
  → JSON response
```

### Diagram C: UI config flow

```text
createSecureAuth({ ui, passwordPolicy, app, auth })
  → buildPublicUIConfig()
  → secureAuth.uiConfig
  → SecureAuthUIProvider (client)
  → useSecureAuthUi() in package pages
  → optional page props override provider values
```

### Diagram D: Single active session

```text
User signs in on device B
  → session service revokes other sessions (if policy enabled)
  → device A: SingleActiveSessionMonitor polls /api/account/sessions
  → detects revocation → signs out locally
```

---

## 18. Claims to verify before publication

| Claim | Verify how |
| --- | --- |
| Current version is `0.1.11-internal` | `packages/secure-auth/package.json`, npm registry |
| npm dist-tag is `internal` vs `latest` | Registry tags vs workflow `--tag latest` in `publish-secure-auth.yml` (docs and workflow may disagree—confirm before stating install command) |
| Install from public npm only | Some docs still mention GitHub Packages; article should use public npm |
| Route count (~35) | `docs/package-api.md` or `secureAuth.routes` keys in source |
| Page list | `@tgoliveira/secure-auth/react` exports |
| `next build` succeeds for thin page re-exports | Run consumer build; known RSC boundary issue may affect article claims |
| OAuth providers supported | Google, Apple, Microsoft in config reference |
| Not production-ready | README, security.md, package description |
| MIT license | `package.json`, LICENSE file |
| NextAuth version | Peer `^4.24.11`; not v5 |
| Default password min length | 12 (from tests and docs) |
| Consumer-demo passes validation | `docs/consumer-demo-validation.md` checklist |

---

## 19. Suggested call-to-action

**For readers evaluating the package:**

1. Read [consumer-quick-start.md](./consumer-quick-start.md) and inspect [apps/consumer-demo](../apps/consumer-demo).
2. Install `@tgoliveira/secure-auth@0.1.11-internal` in a throwaway Next.js app.
3. Run migrations, wire `createSecureAuth`, mount one login route and page.
4. Run `npm run audit:security` if forking or vendoring patterns.
5. Treat as an **experimental foundation**—plan a security review before production.

**For readers building their own package:**

- Study the ownership split (infra in app, domain in package).
- Use explicit DI instead of `process.env` inside libraries.
- Ship a minimal consumer app that uses only public exports to prevent API drift.

**Repository:** [github.com/tgoliveira11/next-secure-auth-starter](https://github.com/tgoliveira11/next-secure-auth-starter)  
**npm:** [@tgoliveira/secure-auth](https://www.npmjs.com/package/@tgoliveira/secure-auth)

---

## 20. Answers to required questions (quick reference)

| # | Question | Short answer |
| --- | --- | --- |
| 1 | What is it? | Opinionated Next.js + Drizzle + PostgreSQL account auth package behind `createSecureAuth(config)`. |
| 2 | What problem? | Stops rebuilding full account auth (credentials, OAuth, 2FA, passkeys, sessions, schema, UI) in every app. |
| 3 | Why exist? | Reuse across projects; centralize security; package-first after starter proved flows. |
| 4 | Who for? | Multi-app Next.js teams on PostgreSQL/Drizzle. Not for other stacks or production-without-review. |
| 5 | What provides? | Routes, pages, schema, migrations, policies, UI, EmailProvider contract, security controls. |
| 6 | How integrate? | App supplies db, env, email; package supplies auth; thin route/page wrappers. |
| 7 | vs NextAuth? | NextAuth = OAuth/session primitives; this = full account product layer for a specific stack. |
| 8 | Trade-offs? | Opinionated, experimental, Next+Drizzle+PG only, wrapper wiring, env mapping in app. |
| 9 | Architecture? | Package-first; single composition root; DI; no package env reads. |
| 10 | Customization? | Config, uiConfig, provider, page props, EmailProvider, CSS variables. |
| 11 | Security? | Policy, 2FA, passkeys, sessions, rate limits, audit, safe logging—not a guarantee. |
| 12 | Maturity? | Published, experimental `0.1.x-internal`, functional, not 1.0 contract. |
| 13 | Titles? | See section 15. |

---

*This brief is documentation only. It does not change package behavior. Update when version, public API, or maturity status changes.*
