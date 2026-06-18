# Configuration reference

Canonical reference for **`createSecureAuth(config)`** options and the environment variables mapped by **`apps/starter`** and **`apps/consumer-demo`**.

## Architecture

```text
.env / .env.local          (app-owned secrets and toggles)
        │
        ▼
buildSecureAuthConfigFromEnv()   ← apps/*/src/lib/env/secure-auth-from-env.ts
        │
        ▼
createSecureAuth(config)           ← @tgoliveira/secure-auth (typed config only)
```

**The package never reads `process.env` at runtime.** Apps read environment variables at the boundary and pass typed config into `createSecureAuth`.

Some variables (for example `DATABASE_URL`, `EMAIL_PROVIDER`, SMTP settings) are used only by app modules and are **not** fields on `SecureAuthConfig`.

---

## Quick links

| App | Env template |
| --- | --- |
| Starter | [apps/starter/.env.example](../apps/starter/.env.example) |
| Consumer demo | [apps/consumer-demo/.env.example](../apps/consumer-demo/.env.example) |
| Monorepo root (starter copy source) | [.env.example](../.env.example) |

---

## TypeScript config shape (`SecureAuthConfig`)

Required top-level fields when calling `createSecureAuth`:

| Path | Type | Description |
| --- | --- | --- |
| `db` | `SecureAuthDb` | Drizzle PostgreSQL database handle (app provides) |
| `app.name` | `string` | Display name |
| `app.slug` | `string` | URL-safe identifier |
| `app.baseUrl` | `string` | Public base URL |
| `auth.afterLoginPath` | `string` | Redirect after successful login |
| `auth.afterLogoutPath` | `string` | Redirect after logout |
| `auth.redirectAuthenticatedFromGuestPages` | `boolean` | `true` | Redirect signed-in users away from login/register/forgot-password |
| `auth.authenticatedRedirectPath` | `string` | `auth.afterLoginPath` | Landing path for authenticated-user guest redirects |
| `auth.requireEmailVerificationBeforeSignIn` | `boolean` | Block sign-in until email verified |
| `auth.nextAuthSecret` | `string` | NextAuth session signing secret |
| `auth.twoFactorEncryptionKey` | `string` | Key for TOTP secrets at rest |
| `email.from` | `string` | Sender address |
| `email.provider` | `EmailProvider` | App-implemented send function |
| `webauthn.rpId` | `string` | WebAuthn RP ID |
| `webauthn.rpName` | `string` | WebAuthn RP display name |
| `webauthn.origin` | `string` | WebAuthn origin (primary) |
| `webauthn.origins` | `string[]` | optional | Additional allowed origins (e.g. subdomains). Apex ↔ www of `origin` is accepted automatically. |
| `captcha.enabled` | `boolean` | `false` | Master switch for Turnstile CAPTCHA |
| `captcha.provider` | `"turnstile"` | `turnstile` | CAPTCHA provider (Turnstile only in this release) |
| `captcha.siteKey` | `string` | — | Turnstile site key (public; exposed via `uiConfig` when enabled) |
| `captcha.secretKey` | `string` | — | Turnstile secret key (server-only; required when `enabled`) |
| `captcha.pages.register` | `boolean` | `false` | Require CAPTCHA on registration |
| `captcha.pages.login` | `boolean` | `false` | Require CAPTCHA on credentials login |

Optional nested config (defaults applied when omitted):

| Path | Type | Default |
| --- | --- | --- |
| `accountPolicy.sendVerificationOnRegister` | `boolean` | `true` |
| `accountPolicy.requireEmailVerificationBeforeSignIn` | `boolean` | `false` |
| `accountPolicy.requireEmailVerificationForAccountApis` | `boolean` | `true` | Block sensitive account APIs when session email is unverified |
| `security.sameOriginProtection.enabled` | `boolean` | `true` | Require allowed Origin/Referer on authenticated mutating API routes |
| `security.sameOriginProtection.allowedOrigins` | `string[]` | `[]` | Extra allowed origins (plus `app.baseUrl` and WebAuthn origins) |
| `debug.authTrace` | `boolean` | `false` | Enable in-memory auth trace logging |
| `debug.exposeTraceRoute` | `boolean` | `false` | Allow `GET /api/auth/login/trace` (requires `authTrace`) |
| `passwordPolicy.*` | see [Password policy](#password-policy) | package defaults |
| `sessions.maxAgeSeconds` | `number` | `2592000` (30 days) |
| `sessions.lastUsedUpdateIntervalSeconds` | `number` | `300` |
| `sessions.singleActiveSession` | `boolean` | `false` |
| `rateLimit.store` | `"memory"` \| `"postgres"` | `"memory"` |
| `server.cookieSecure` | `boolean` | `false` (apps: `true` when `NODE_ENV=production` if env unset) |
| `debug.authTrace` | `boolean` | `false` |
| `oauth.google` / `apple` / `github` / `microsoft` | provider objects | omitted when credentials missing |
| `ui.brand.name` | `string` | from `app.name` |
| `ui.paths.*` | `string` | package defaults (apps override in code) |
| `ui.messages.*` | `string` | apps override in code |
| `ui.passwordStrength.position` | `"above"` \| `"below"` | `"above"` |
| `email.templates` | optional template fns | package defaults |

---

## Environment variables

Parsing helpers live in `apps/*/src/lib/env/parse.ts`:

- **Booleans:** `"true"` / `"false"` only; invalid values **throw** at startup.
- **Numbers:** invalid non-numeric values **throw**; out-of-range values **fall back** to default.
- **Enums:** invalid values **fall back** to default.

### App

| Variable | Type | Default | Required | Maps to | Description |
| --- | --- | --- | --- | --- | --- |
| `APP_BASE_URL` | string | app default URL | optional | `app.baseUrl`, `webauthn.origin` fallback | Public app URL |
| `APP_NAME` | string | brand in code | optional | `app.name`, `ui.brand.name`, `webauthn.rpName` fallback | Display name |
| `APP_SLUG` | string | brand slug in code | optional | `app.slug` | URL-safe identifier |
| `NODE_ENV` | string | — | optional | `server.cookieSecure` fallback | When `AUTH_COOKIE_SECURE` is unset, production enables secure cookies |

**Example:** `APP_BASE_URL=http://localhost:3001`

### Database

| Variable | Type | Required | Maps to | Description |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | string | **yes** (runtime) | app `db` module only | PostgreSQL connection string |

Not passed to `createSecureAuth`; the app constructs the Drizzle client and passes `db`.

### Auth / NextAuth

| Variable | Type | Default | Required | Maps to | Description |
| --- | --- | --- | --- | --- | --- |
| `NEXTAUTH_URL` | string | — | recommended | `app.baseUrl` fallback | Canonical URL (alias for base URL) |
| `NEXTAUTH_SECRET` | string | `""` | **yes** in production | `auth.nextAuthSecret` | Session signing secret |
| `AUTH_AFTER_LOGIN_PATH` | string | `/dashboard` | optional | `auth.afterLoginPath` | Post-login redirect |
| `AUTH_REDIRECT_AUTHENTICATED_FROM_GUEST_PAGES` | boolean | `true` | optional | `auth.redirectAuthenticatedFromGuestPages` | Guest-page redirect for signed-in users |
| `AUTH_AUTHENTICATED_REDIRECT_PATH` | string | `AUTH_AFTER_LOGIN_PATH` | optional | `auth.authenticatedRedirectPath` | Landing path for guest-page redirect |
| `AUTH_AFTER_LOGOUT_PATH` | string | `/login` | optional | `auth.afterLogoutPath` | Post-logout redirect |
| `TWO_FACTOR_SECRET_ENCRYPTION_KEY` | string | `""` | **yes** in production | `auth.twoFactorEncryptionKey` | 32-byte base64 key for TOTP at rest |

### OAuth

Provider blocks are **omitted** unless both client ID and secret are set.

| Variable | Type | Maps to | Notes |
| --- | --- | --- | --- |
| `AUTH_GOOGLE_CLIENT_ID` | string | `oauth.google.clientId` | Legacy: `GOOGLE_CLIENT_ID` |
| `AUTH_GOOGLE_CLIENT_SECRET` | string | `oauth.google.clientSecret` | Legacy: `GOOGLE_CLIENT_SECRET` |
| `AUTH_APPLE_CLIENT_ID` | string | `oauth.apple.clientId` | Legacy: `APPLE_CLIENT_ID` |
| `AUTH_APPLE_CLIENT_SECRET` | string | `oauth.apple.clientSecret` | Legacy: `APPLE_CLIENT_SECRET` |
| `AUTH_GITHUB_CLIENT_ID` | string | `oauth.github.clientId` | Legacy: `GITHUB_CLIENT_ID` |
| `AUTH_GITHUB_CLIENT_SECRET` | string | `oauth.github.clientSecret` | Legacy: `GITHUB_CLIENT_SECRET` |
| `AUTH_MICROSOFT_CLIENT_ID` | string | `oauth.microsoft.clientId` | Legacy: `AUTH_MICROSOFT_ID`, `AUTH_AZURE_AD_ID` |
| `AUTH_MICROSOFT_CLIENT_SECRET` | string | `oauth.microsoft.clientSecret` | Legacy: `AUTH_MICROSOFT_SECRET`, `AUTH_AZURE_AD_SECRET` |
| `AUTH_MICROSOFT_TENANT_ID` | string | `oauth.microsoft.tenantId` | Default `common`; legacy: `AUTH_AZURE_AD_TENANT_ID` |

Starter also documents `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` for Apple JWT signing in the starter email/OAuth module — not `createSecureAuth` fields.

### GitHub OAuth setup

1. Create a [GitHub OAuth App](https://github.com/settings/developers) (Settings → Developer settings → OAuth Apps).
2. Set **Authorization callback URL** to your NextAuth callback:

   | Environment | Callback URL |
   | --- | --- |
   | Local starter | `http://localhost:3001/api/auth/callback/github` |
   | Local consumer-demo | `http://localhost:3002/api/auth/callback/github` |
   | Production | `https://your-domain.com/api/auth/callback/github` |

3. Copy **Client ID** and **Client secret** into `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET`.
4. Map env in app code — the package does **not** read these variables directly.

GitHub OAuth Apps allow **one** callback URL per app. Use separate OAuth Apps for local, staging, and production, or tunnel local dev through a stable HTTPS URL.

Provider id in NextAuth and account records: `github`. UI label: **GitHub**. The sign-in button appears only when both credentials are configured.

### Email (app modules)

| Variable | Type | Default | Maps to | Description |
| --- | --- | --- | --- | --- |
| `EMAIL_FROM` | string | app name + `noreply@localhost` | `email.from` | Sender address |
| `EMAIL_PROVIDER` | `console` \| `smtp` | `console` | starter email module only | Delivery backend |
| `SMTP_HOST` | string | — | starter SMTP module | SMTP host |
| `SMTP_PORT` | number | — | starter SMTP module | SMTP port |
| `SMTP_SECURE` | boolean | `false` | starter SMTP module | TLS |
| `SMTP_USER` | string | — | starter SMTP module | SMTP username |
| `SMTP_PASSWORD` | string | — | starter SMTP module | SMTP password |

`email.provider` is always implemented in app code (`sendEmail` or `consoleEmailProvider`).

### WebAuthn / Passkeys

| Variable | Type | Default | Maps to | Description |
| --- | --- | --- | --- | --- |
| `WEBAUTHN_RP_ID` | string | `localhost` | `webauthn.rpId` | Relying party ID |
| `WEBAUTHN_RP_NAME` | string | `APP_NAME` | `webauthn.rpName` | RP display name |
| `WEBAUTHN_ORIGIN` | string | `APP_BASE_URL` | `webauthn.origin` | Primary expected origin; paired apex/www is accepted automatically |

### CAPTCHA (Cloudflare Turnstile)

| Variable | Type | Default | Maps to | Description |
| --- | --- | --- | --- | --- |
| `AUTH_CAPTCHA_ENABLED` | boolean | `false` | `captcha.enabled` | Master switch |
| `AUTH_CAPTCHA_PROVIDER` | string | `turnstile` | `captcha.provider` | Provider id (Turnstile only) |
| `AUTH_CAPTCHA_TURNSTILE_SITE_KEY` | string | — | `captcha.siteKey` | Public site key |
| `AUTH_CAPTCHA_TURNSTILE_SECRET_KEY` | string | — | `captcha.secretKey` | Secret key (server-only) |
| `AUTH_CAPTCHA_REGISTER_ENABLED` | boolean | `false` | `captcha.pages.register` | CAPTCHA on registration |
| `AUTH_CAPTCHA_LOGIN_ENABLED` | boolean | `false` | `captcha.pages.login` | CAPTCHA on credentials login |

### Sessions

| Variable | Type | Default | Maps to | Description |
| --- | --- | --- | --- | --- |
| `AUTH_SESSION_MAX_AGE_SECONDS` | number | `2592000` | `sessions.maxAgeSeconds` | Max session lifetime (min 60) |
| `AUTH_SESSION_LAST_USED_UPDATE_SECONDS` | number | `300` | `sessions.lastUsedUpdateIntervalSeconds` | Last-used ping interval (min 30) |
| `AUTH_SESSION_PING_INTERVAL_SECONDS` | number | — | alias for last-used interval | Same as above |
| `SESSION_LAST_USED_UPDATE_INTERVAL_SECONDS` | number | — | legacy alias | Same as above |
| `AUTH_SINGLE_ACTIVE_SESSION` | boolean | `false` | `sessions.singleActiveSession` | Revoke other sessions on login |
| `AUTH_SESSION_REVOCATION_POLL_SECONDS` | number | `10` | `sessions.revocationPollIntervalSeconds` | How often revoked clients poll and sign out (5–300) |

**Example — single active session:**

```bash
AUTH_SINGLE_ACTIVE_SESSION=true
```

Other browsers/devices are revoked in the database on login. The starter and consumer-demo apps poll `/api/auth/session` every **10 seconds** by default (`AUTH_SESSION_REVOCATION_POLL_SECONDS`) and call **`signOut`** plus a redirect to login when the session no longer has a user. Switching back to a revoked tab also triggers an immediate check.

### Password policy

| Variable | Type | Default | Allowed | Maps to |
| --- | --- | --- | --- | --- |
| `AUTH_PASSWORD_POLICY_ENFORCEMENT` | enum | `warn` | `off`, `warn`, `enforce` | `passwordPolicy.enforcement` |
| `AUTH_PASSWORD_MIN_LENGTH` | number | `12` | 1–128 | `passwordPolicy.minLength` |
| `AUTH_PASSWORD_REQUIRE_UPPERCASE` | boolean | `false` | | `passwordPolicy.requireUppercase` |
| `AUTH_PASSWORD_REQUIRE_LOWERCASE` | boolean | `false` | | `passwordPolicy.requireLowercase` |
| `AUTH_PASSWORD_REQUIRE_NUMBER` | boolean | `false` | | `passwordPolicy.requireNumber` |
| `AUTH_PASSWORD_REQUIRE_SYMBOL` | boolean | `false` | | `passwordPolicy.requireSymbol` |
| `AUTH_PASSWORD_BLOCK_COMMON_PASSWORDS` | boolean | `true` | | `passwordPolicy.blockCommonPasswords` |
| `AUTH_PASSWORD_MIN_SCORE` | number | `2` | 0–4 | `passwordPolicy.minScore` |
| `AUTH_PASSWORD_STRENGTH_POSITION` | enum | `above` | `above`, `below` | `ui.passwordStrength.position` |

Legacy `PASSWORD_*` names are supported for policy fields (not strength position).

The package does **not** read `process.env` for password policy. Your app maps `AUTH_PASSWORD_MIN_LENGTH` (and related vars) into `createSecureAuth({ passwordPolicy: { minLength } })`. The resolved value drives UI copy, browser `minLength`, client validation, server validation, and `GET /api/auth/password-policy`.

When using package pages (`RegisterPage`, `ResetPasswordPage`, …), wrap your root layout with `SecureAuthUIProvider config={secureAuth.uiConfig}` so password screens inherit the configured policy. Without the provider, password fields fall back to `GET /api/auth/password-policy` (then package defaults).

**Example — shorter minimum length for local development:**

```bash
AUTH_PASSWORD_MIN_LENGTH=5
```

**Example — strength feedback below the field:**

```bash
AUTH_PASSWORD_STRENGTH_POSITION=below
```

Invalid position values fall back to `above`.

### Product-specific passwords (vault, encryption, etc.)

The package does **not** define env vars for non-auth passwords. Define your own in the consumer app and map them to a `policy` object passed to `PasswordStrengthField` / `PasswordSetupFields` or to `validatePasswordSetup` before submit.

```env
VAULT_PASSWORD_MIN_LENGTH=16
VAULT_PASSWORD_REQUIRE_UPPERCASE=true
VAULT_PASSWORD_REQUIRE_LOWERCASE=true
VAULT_PASSWORD_REQUIRE_NUMBER=true
VAULT_PASSWORD_REQUIRE_SYMBOL=true
```

See [generic-password-components.md](./generic-password-components.md).

### Account / email verification

| Variable | Type | Default | Maps to |
| --- | --- | --- | --- |
| `EMAIL_VERIFICATION_SEND_ON_REGISTER` | boolean | `true` | `accountPolicy.sendVerificationOnRegister` |
| `EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN` | boolean | `false` | `auth.requireEmailVerificationBeforeSignIn`, `accountPolicy.requireEmailVerificationBeforeSignIn` |

### Rate limiting

| Variable | Type | Default | Allowed | Maps to | Description |
| --- | --- | --- | --- | --- | --- |
| `AUTH_RATE_LIMIT_STORE` | enum | `memory` | `memory`, `postgres` | `rateLimit.store` | Backing store |

Legacy: `RATE_LIMIT_STORE`.

When `AUTH_RATE_LIMIT_STORE=postgres`, the app must apply package migrations so the `rate_limit_buckets` table exists. Use `memory` for single-instance local development.

**Not supported via env or config today** (fixed in package): `AUTH_RATE_LIMIT_ENABLED`, window duration, max requests per window. Do not set these expecting behavior change.

### Cookies

| Variable | Type | Default | Maps to | Description |
| --- | --- | --- | --- | --- |
| `AUTH_COOKIE_SECURE` | boolean | production → `true` | `server.cookieSecure` | `Secure` flag on auth cookies |

Consumer demo legacy alias: `COOKIE_SECURE`.

When unset, both apps use `NODE_ENV === "production"`.

### Debug

| Variable | Type | Default | Maps to | Description |
| --- | --- | --- | --- | --- |
| `AUTH_TRACE` | boolean | `false` | `debug.authTrace` | Server auth flow trace logging |
| `AUTH_DEBUG_TRACE` | boolean | — | alias for `AUTH_TRACE` | Same |
| `NEXT_PUBLIC_AUTH_DEBUG_TRACE` | boolean | `false` | starter client only | Not `createSecureAuth` |

---

## Options not in `SecureAuthConfig`

These appear in some checklists or `.env` templates but are **not** package config today:

| Variable / concept | Status |
| --- | --- |
| `AUTH_SESSION_IDLE_TIMEOUT_SECONDS` | Not implemented |
| `AUTH_RATE_LIMIT_ENABLED` | Not configurable (always on where applied) |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | Not configurable |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | Not configurable |
| `AUTH_ACCOUNT_DELETION_REQUIRE_RECENT_SESSION` | Not in config |
| `AUTH_ACCOUNT_DELETION_RECENT_SESSION_SECONDS` | Not in config |
| `ui.paths`, `ui.messages` | Set in app code (`secure-auth.ts`), not env |
| `email.templates` | Optional TypeScript-only override |

---

## Code examples

### Minimal app wiring (consumer pattern)

```typescript
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";

const envConfig = buildSecureAuthConfigFromEnv({
  appName: "My App",
  appSlug: "my-app",
  baseUrl: "http://localhost:3000",
});

export const secureAuth = createSecureAuth({
  db,
  ...envConfig,
  email: {
    from: readEnv(process.env, "EMAIL_FROM") ?? "My App <noreply@localhost>",
    provider: myEmailProvider,
  },
  ui: {
    ...envConfig.ui,
    paths: { login: "/login", /* ... */ },
  },
});
```

### Direct TypeScript config (no env)

```typescript
createSecureAuth({
  db,
  app: { name: "My App", slug: "my-app", baseUrl: "https://example.com" },
  auth: {
    afterLoginPath: "/dashboard",
    afterLogoutPath: "/login",
    requireEmailVerificationBeforeSignIn: false,
    nextAuthSecret: "...",
    twoFactorEncryptionKey: "...",
  },
  sessions: {
    maxAgeSeconds: 60 * 60 * 24 * 7,
    singleActiveSession: true,
  },
  passwordPolicy: {
    enforcement: "enforce",
    minLength: 14,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: false,
    blockCommonPasswords: true,
    minScore: 3,
  },
  rateLimit: { store: "postgres" },
  server: { cookieSecure: true },
  debug: { authTrace: false },
  oauth: {
    google: { clientId: "...", clientSecret: "..." },
  },
  webauthn: {
    rpId: "example.com",
    rpName: "My App",
    origin: "https://example.com",
  },
  email: { from: "...", provider: myProvider },
  ui: {
    passwordStrength: { position: "above" },
  },
});
```

---

## Related documentation

- [docs/customization.md](customization.md) — UI and policy customization
- [docs/package-api.md](package-api.md) — exports and integration API
- [docs/security.md](security.md) — security checklist
- [docs/consumer-quick-start.md](consumer-quick-start.md) — minimal integration walkthrough
