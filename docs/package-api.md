# Package API

Package: `@tgoliveira/secure-auth` (current version in
[`packages/secure-auth/package.json`](../packages/secure-auth/package.json))

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

## Route map

Wire each handler in your App Router under the consumer URL path shown below. Canonical consumer wiring in this monorepo: [`apps/consumer-demo/src/app/api`](../apps/consumer-demo/src/app/api). See also [`apps/dev-harness/src/app/api`](../apps/dev-harness/src/app/api) for the internal development harness (extra routes not required for consumers).

| Handler key | Method | Consumer URL path | Auth required |
| --- | --- | --- | --- |
| `health` | GET | `/api/auth/package-health` | No |
| `register` | POST | `/api/auth/register` | No |
| `forgotPassword` | POST | `/api/auth/forgot-password` | No |
| `magicLinkRequest` | POST | `/api/auth/magic-link/request` | No |
| `magicLinkVerify` | POST | `/api/auth/magic-link/verify` | No |
| `resetPassword` | POST | `/api/auth/reset-password` | No |
| `verifyEmailConfirm` | POST | `/api/auth/verify-email/confirm` | No |
| `verifyEmailResend` | POST | `/api/auth/verify-email/resend` | Yes |
| `loginStart` | POST | `/api/auth/login/start` | No |
| `loginStartForm` | POST | `/api/auth/login/start-form` | No |
| `loginComplete` | POST | `/api/auth/login/complete` | No |
| `loginVerify2fa` | POST | `/api/auth/login/verify-2fa` | No |
| `loginVerify2faForm` | POST | `/api/auth/login/verify-2fa-form` | No |
| `loginVerify2faOauth` | POST | `/api/auth/login/verify-2fa-oauth` | No |
| `loginChallengeStatus` | GET | `/api/auth/login/challenge-status` | No |
| `loginTrace` | GET | `/api/auth/login/trace` | No |
| `passkeyLoginOptions` | POST | `/api/auth/passkey/login/options` | No |
| `passkeyLoginVerify` | POST | `/api/auth/passkey/login/verify` | No |
| `passwordPolicy` | GET | `/api/auth/password-policy` | No |
| `nextAuth` | GET, POST | `/api/auth/[...nextauth]` | No |
| `account` | GET | `/api/account` | Yes |
| `account` | DELETE | `/api/account` | Yes |
| `accountAuthStatus` | GET | `/api/account/auth-status` | Yes |
| `changePassword` | POST | `/api/account/change-password` | Yes |
| `passkeysList` | GET | `/api/account/passkeys` | Yes |
| `passkeyRegister` | POST | `/api/account/passkeys/register` | Yes |
| `passkeyById` | DELETE | `/api/account/passkeys/[id]` | Yes |
| `passkeyEnableSignIn` | POST | `/api/account/passkeys/[id]/enable-sign-in` | Yes |
| `twoFactorStatus` | GET | `/api/account/2fa/status` | Yes |
| `twoFactorSetupStart` | POST | `/api/account/2fa/setup/start` | Yes |
| `twoFactorSetupVerify` | POST | `/api/account/2fa/setup/verify` | Yes |
| `twoFactorDisable` | POST | `/api/account/2fa/disable` | Yes |
| `twoFactorBackupCodesRegenerate` | POST | `/api/account/2fa/backup-codes/regenerate` | Yes |
| `sessionsList` | GET | `/api/account/sessions` | Yes |
| `sessionById` | DELETE | `/api/account/sessions/[id]` | Yes |
| `sessionsPing` | POST | `/api/account/sessions/ping` | Yes |
| `sessionsRevokeCurrent` | POST | `/api/account/sessions/revoke-current` | Yes |
| `sessionsRevokeOthers` | POST | `/api/account/sessions/revoke-others` | Yes |
| `sessionsRevokeAll` | POST | `/api/account/sessions/revoke-all` | Yes |
| `accountPreferences` | GET, PATCH | `/api/account/preferences` | Yes (opt-in) |
| `accountPreferencesByKey` | GET, PUT, DELETE | `/api/account/preferences/[key]` | Yes (opt-in) |
| `accountPreferencesExport` | GET | `/api/account/preferences/export` | Yes (opt-in) |

**Auth required** means the handler expects a valid NextAuth session cookie (`getServerSession`). Handlers that call `requireSessionUser`, `requireVerifiedFullyAuthenticatedUser`, or `requireVerifiedMutatingAccountUser` return **401** when no session is present.

When `preferences.enabled` is `false`, preference routes return **404**.

Preference writes support optional optimistic concurrency via `If-Match` / `etags` (412 on conflict).

Example wrapper:

```typescript
// src/app/api/auth/register/route.ts
import { secureAuth } from "@/lib/secure-auth";

export const POST = secureAuth.routes.register.POST;
```

---

## API error responses

On failure, JSON routes return a body shaped like:

```json
{ "error": "<message string>" }
```

with an appropriate HTTP status code. Success responses use route-specific shapes (for example `{ "loginToken": "..." }`).

Form-based auth routes (`loginStartForm`, `loginVerify2faForm`) respond with **303 redirects** and `?error=` query parameters instead of JSON bodies.

| Route | Status | Condition | Error message |
| --- | --- | --- | --- |
| `POST /api/auth/login/start-form` | 303 | Invalid payload | Redirect to `/login?error=invalid_request` |
| `POST /api/auth/login/start-form` | 303 | Password in URL or invalid HTTP method | Redirect to `/login?error=invalid_request` |
| `POST /api/auth/login/start-form` | 303 | CAPTCHA verification failed | Redirect to `/login?error=captcha_failed` |
| `POST /api/auth/login/start-form` | 303 | Invalid email or password | Redirect to `/login?error=invalid_credentials` |
| `POST /api/auth/login/start-form` | 303 | Unexpected service failure | Redirect to `/login?error=unavailable` |
| `POST /api/auth/login/verify-2fa` | 400 | Invalid JSON body or missing TOTP/backup code | `"Invalid request"` |
| `POST /api/auth/login/verify-2fa` | 400 | Missing HttpOnly challenge cookie | `"Invalid request"` |
| `POST /api/auth/login/verify-2fa` | 401 | Expired or invalid login challenge | `"Login challenge expired or invalid"` |
| `POST /api/auth/login/verify-2fa` | 401 | Invalid TOTP or backup code | `"Invalid authenticator or backup code"` |
| `POST /api/auth/register` | 400 | Schema validation failed | `"Invalid input"` |
| `POST /api/auth/register` | 400 | Email already registered | `"Unable to complete registration with the provided information."` |
| `POST /api/auth/register` | 400 | Password in URL or invalid HTTP method | `"Invalid request"` |
| `POST /api/auth/register` | 400 | Password policy rejected | Policy message from `ValidationError` (for example `"Password does not meet the configured policy."`) |
| `POST /api/auth/forgot-password` | 400 | Invalid email in body | `"Invalid email address"` |
| `POST /api/auth/reset-password` | 400 | Invalid body or unknown action | `"Invalid request"` |
| `POST /api/auth/reset-password` | 400 | Password in URL or invalid HTTP method | `"Invalid request"` |
| `POST /api/auth/reset-password` | 400 | Invalid or expired reset token on `action: "reset"` | `"This reset link is invalid or expired."` |
| `POST /api/auth/reset-password` | 400 | New password fails policy on `action: "reset"` | Policy message from `ValidationError` |
| `POST /api/account/change-password` | 400 | Invalid body | `"Invalid request"` |
| `POST /api/account/change-password` | 400 | Password in URL or invalid HTTP method | `"Invalid request"` |
| `POST /api/account/change-password` | 400 | OAuth-only account (no password) | `"This account signs in with Google, Apple, GitHub, or Microsoft. Password change is not available unless you add an email/password sign-in method."` |
| `POST /api/account/change-password` | 401 | Incorrect current password | `"Current password is incorrect."` |
| `POST /api/account/change-password` | 400 | New password fails policy | Policy message from `ValidationError` |
| `DELETE /api/account/passkeys/[id]` | 400 | Missing route param | `"Invalid request"` |
| `DELETE /api/account/passkeys/[id]` | 409 | Vault-only or dual-capability passkey | `"This passkey is not managed from account security settings."` or `"This passkey is used by another security feature. Manage it from the relevant settings page."` |
| `POST /api/account/passkeys/[id]/enable-sign-in` | 400 | Missing id, invalid payload, PRF extension result, invalid/expired proof, or failed WebAuthn verification | `"Invalid request"` or passkey verification message |
| `POST /api/account/passkeys/[id]/enable-sign-in` | 409 | Credential is already sign-in enabled or is not vault-only | Capability-specific conflict message |
| `POST /api/account/2fa/disable` | 400 | Invalid body | `"Invalid request"` |
| `POST /api/account/2fa/disable` | 400 | Invalid TOTP or backup code | `"Invalid authenticator or backup code"` |

Routes return **401** with `{ "error": "Authentication required" }` when the route requires a session and no valid session cookie is present. Pending two-factor login returns **401** with `{ "error": "Two-factor verification required" }`.

---

## Supported public entry points

### `@tgoliveira/secure-auth`

| | |
| --- | --- |
| **Purpose** | Core types, schema re-exports, package version, logger helper |
| **Audience** | Server-side app wiring, email adapters |
| **Example** | `import { authSchema, SECURE_AUTH_PACKAGE_VERSION, safeLogger } from "@tgoliveira/secure-auth"` |

Exports include: `SecureAuthConfig`, `SecureAuthDb`, `SecureAuthServices`,
`PasskeyLoginAuthenticationExtensionsContext`, `PasskeyLoginAuthenticationExtensions` (types),
`WebAuthnOriginAliasPolicy`, `EmailProvider`, `authSchema`, `SECURE_AUTH_PACKAGE_VERSION`,
`safeLogger`.

`SecureAuthConfig.webauthn.getLoginAuthenticationExtensions` is an optional server-only callback.
After account and sign-in credentials are resolved, it receives `{ userId, credentialIds }` and
may return bounded JSON-safe extension inputs. Secure-auth merges them only into
`PublicKeyCredentialRequestOptions.extensions`; the callback cannot change authentication policy.

`SecureAuthConfig.webauthn.originAliasPolicy` and the exported `WebAuthnOriginAliasPolicy` type
control origin expansion. `"apex-www"` is the compatible default; `"none"` makes the primary and
explicit extra origins exact and excludes implicit `app.baseUrl`, apex/www, and loopback aliases.

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
| `LoginPage` | `/login` | Email/password, passkey, OAuth; passkey + TOTP when 2FA enabled |
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
| `SecureAuthUIPublicConfig` | Type for serializable UI config (no secrets); includes `passwordStrength.position`, `auth.redirectAuthenticatedFromGuestPages`, and optional `oauthProviderIds` |
| `OAuthProviderId` | Public provider ID union: `google \| apple \| github \| azure-ad` |

Guest-only pages redirect fully authenticated users to `uiConfig.auth.authenticatedRedirectPath` by default. Opt out globally via `auth.redirectAuthenticatedFromGuestPages: false` or per page with `redirectIfAuthenticated={false}`. See [consumer-authenticated-redirect-migration.md](./consumer-authenticated-redirect-migration.md).

`createSecureAuth(config)` always populates `uiConfig.oauthProviderIds` with the effective NextAuth
OAuth providers. The property is optional in the TypeScript shape for backward compatibility with
previously serialized or manually constructed UI config. Package UI treats a missing property as an
empty list. `SocialSignIn` accepts an explicit `providerIds` override for standalone composition.

#### Middleware (optional)

| Export (`@tgoliveira/secure-auth/next/middleware`) | Purpose |
| --- | --- |
| `createSecureAuthMiddleware` | Next.js middleware for incomplete-auth routing and guest-page redirects |
| `buildMiddlewareConfigFromUi` | Build middleware config from `uiConfig` + `NEXTAUTH_SECRET` |
| `defaultSecureAuthMiddlewareMatcher` | Suggested `config.matcher` |

Use the **`/next/middleware`** entry in `middleware.ts` — not `@tgoliveira/secure-auth/next` (server bundle).

```tsx
import {
  createSecureAuthMiddleware,
  buildMiddlewareConfigFromUi,
  defaultSecureAuthMiddlewareMatcher,
} from "@tgoliveira/secure-auth/next/middleware";

export const middleware = createSecureAuthMiddleware({
  ...buildMiddlewareConfigFromUi(secureAuth.uiConfig, process.env.NEXTAUTH_SECRET!),
});
export const config = defaultSecureAuthMiddlewareMatcher;
```

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
| **Example** | `import { ConfirmDialog, registerAccountPasskey, signInWithPasskey } from "@tgoliveira/secure-auth/react/client"` |

Passkey browser orchestration exports:

- `registerAccountPasskey` and `AccountPasskeyRegistrationHooks`
- `signInWithPasskey` and `PasskeyLoginHooks`
- `PasskeyLoginIntegrationCompletion` and `PasskeyLoginIntegrationResult`
- `enableAccountPasskeySignIn`

`SecuritySettingsPage.allowPasskeySignInCapabilityPromotion` and
`PasskeySettings.allowSignInCapabilityPromotion` default to `false`. Mounting the route alone does
not expose the promotion action in package UI.

Registration hooks run only after exact server/browser credential-id equality. Login's
`onFullyAuthenticated` runs only after final account-session creation and never while TOTP is
pending. It may return a typed same-app `action_required` redirect; package UI surfaces callback
failure instead of treating it as completed. See
[passkey-credential-interoperability.md](./passkey-credential-interoperability.md).

---

### `@tgoliveira/secure-auth/client`

| | |
| --- | --- |
| **Purpose** | Browser-safe API client, passkey helpers, formatters, cookie name builders |
| **Audience** | Client components, shared isomorphic helpers |
| **Example** | `import { accountApi, passkeyLoginApi, buildLoginPendingTokenCookieName } from "@tgoliveira/secure-auth/client"` |

Passkey privacy and capability exports include:

- `sanitizeWebAuthnResponseForSecureAuthServer(response)` — returns a non-mutating copy without
  documented PRF-derived fields; server routes independently enforce a recursive bounded guard;
- `passkeyAccountApi.enableSignInOptions(id)` / `enableSignInVerify(id, payload)`.

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
npm install next@^16.2.11 react@^19 react-dom@^19 next-auth@^4.24.15 drizzle-orm@^0.45.2
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
{ "ok": true, "package": "@tgoliveira/secure-auth", "version": "0.1.25" }
```

Version comes from `SECURE_AUTH_PACKAGE_VERSION` — not a hardcoded route string.

---

## Account passkeys

See [Route map](#route-map) for handler keys and paths.

### Account passkeys (`passkeysList` / `passkeyById` / `passkeyEnableSignIn`)

`GET /api/account/passkeys` returns capability-aware items:

```typescript
{
  passkeys: Array<{
    id: string;
    friendlyName: string;
    signInEnabled: boolean;
    vaultUnlockEnabled: boolean;
    capabilities: { signIn: boolean; vaultUnlock: boolean };
    removableFromAccountSettings: boolean;
    label: string;
    description: string;
    badge: string | null;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
}
```

`DELETE /api/account/passkeys/:id` removes **account sign-in-only** credentials. Returns **409** when the credential is vault-only, dual-capability, or otherwise not managed from account settings.

`POST /api/account/passkeys/register` with `action: "options"` returns WebAuthn registration options whose `excludeCredentials` list includes **only** existing credentials with `signInEnabled: true`. Vault-only credentials are omitted so they do not block account passkey registration. Verification always inserts `signInEnabled: true`, `vaultUnlockEnabled: false` — it does not silently upgrade vault-only rows.

`POST /api/account/passkeys/:id/enable-sign-in` explicitly promotes an existing vault-only
credential. Use `{ action: "options" }`, complete the exact WebAuthn assertion, then submit
`{ action: "verify", response }`. The route requires a fully authenticated same-origin session,
`userVerification: "required"`, a distinct single-use challenge audience, and a successful
monotonic counter/revision compare-and-set. Apply migration `0004_outgoing_william_stryker.sql`
before deploying this contract.

Passkey login continues to use only `signInEnabled: true` credentials.

Some authenticators prevent registering a second passkey for the same site on the same device. Use
the explicit capability upgrade for an existing vault-only credential instead of re-registering it.

See [consumer-passkey-capability-boundaries.md](./consumer-passkey-capability-boundaries.md) and
[passkey-credential-interoperability.md](./passkey-credential-interoperability.md).

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
