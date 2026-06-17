# Customization

Consumers customize behavior through `createSecureAuth(config)` and `SecureAuthUIProvider` — no file copying required.

**Configuration reference:** [configuration-reference.md](./configuration-reference.md) (env vars, defaults, and TypeScript config paths).

See [apps/consumer-demo](../apps/consumer-demo) for a working minimal integration that uses page wrappers, route wrappers, and `secureAuth.uiConfig` without recreating auth UI.

## UI configuration flow

```text
createSecureAuth({ ui: { ... } })
        ↓
secureAuth.uiConfig  (serializable SecureAuthUIPublicConfig)
        ↓
SecureAuthUIProvider in app layout
        ↓
Package pages via useSecureAuthUi()
```

### Server config

```typescript
export const secureAuth = createSecureAuth({
  db,
  app: { name: "Acme Corp", slug: "acme", baseUrl: "https://app.acme.com" },
  auth: { afterLoginPath: "/dashboard", /* ... */ },
  ui: {
    paths: {
      login: "/login",
      register: "/register",
      account: "/settings/account",
      security: "/settings/security",
      sessions: "/settings/sessions",
    },
    messages: {
      loginTitle: "Sign in to Acme",
      registerTitle: "Create your Acme account",
      securitySettingsTitle: "Security",
    },
    cssVariables: {
      "--sa-brand": "#2563eb",
    },
  },
  passwordPolicy: { enforcement: "warn", minLength: 12 },
});
```

Override `passwordPolicy.minLength` in app env (`AUTH_PASSWORD_MIN_LENGTH`) or TypeScript config. The package merges partial overrides with defaults via `mergePasswordPolicy()` (`minLength` defaults to **12** when omitted). The effective policy is exposed as `secureAuth.passwordPolicy`, `secureAuth.uiConfig.passwordPolicy`, and used consistently by register, reset-password, and change-password flows when `SecureAuthUIProvider` is wired.

`uiConfig` includes resolved `paths`, `messages`, `appSlug`, `appName`, `passwordPolicy`, and `passwordStrength`. It contains **no secrets** and **no React nodes** — safe to pass from server layout to client provider.

### Client provider

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

With a typical app providers wrapper (e.g. `SessionProvider` + `SecureAuthUIProvider`).

### Per-page overrides

Package pages still accept props that override provider defaults:

```tsx
import { LoginPage } from "@tgoliveira/secure-auth/react";

export default function Page() {
  return <LoginPage title="Welcome back" afterLoginPath="/home" />;
}
```

Helpers: `DEFAULT_AUTH_PATHS`, `resolveAuthPaths()`, `useSecureAuthUi()`.

## Password strength feedback placement

Password strength, validation, and policy feedback render **above** the relevant password field by default across all package pages and forms (`RegisterPage`, `ResetPasswordPage`, change-password settings, and `PasswordStrengthField`).

Configure globally in `createSecureAuth`:

```typescript
export const secureAuth = createSecureAuth({
  // ...
  ui: {
    passwordStrength: {
      position: "below", // legacy placement under the field
    },
  },
});
```

`uiConfig.passwordStrength.position` flows through `SecureAuthUIProvider` → `useSecureAuthUi()` → package components.

Override on a single page when needed (prop wins over provider):

```tsx
import { ResetPasswordPage } from "@tgoliveira/secure-auth/react";

export default function Page() {
  return <ResetPasswordPage passwordStrengthPosition="below" />;
}
```

Supported values: `"above"` (default) | `"below"`.

The feedback region is mounted from the first render. Before typing, neutral password requirements appear in that region (when policy feedback is enabled). While typing, strength and validation messages update in the same slot without remounting the password input or stealing focus.

## Session policy

By default, users may have multiple concurrent active sessions (different browsers/devices).

Opt in to single active session mode:

```typescript
export const secureAuth = createSecureAuth({
  // ...
  sessions: {
    singleActiveSession: true,
  },
});
```

When enabled, each **fully successful** login keeps the current session and revokes all other active sessions for that user. Applies to email/password (including post-2FA), passkey, and OAuth sign-in. The current device stays signed in; other devices are **signed out automatically** — by default within about **10 seconds** via `SingleActiveSessionMonitor` (server session poll + `signOut` + redirect), or immediately when you focus a revoked tab.

## CAPTCHA (Cloudflare Turnstile)

Optional bot protection for registration and credentials login. Disabled by default.

```typescript
createSecureAuth({
  captcha: {
    enabled: true,
    provider: "turnstile",
    siteKey: process.env.AUTH_CAPTCHA_TURNSTILE_SITE_KEY!,
    secretKey: process.env.AUTH_CAPTCHA_TURNSTILE_SECRET_KEY!,
    pages: {
      register: true,
      login: false,
    },
  },
});
```

`RegisterPage` and `CredentialsLoginForm` render `TurnstileCaptcha` when the matching page flag is enabled. Token field name: `captchaToken`. Server handlers validate before account creation or password verification.

Export: `TurnstileCaptcha` from `@tgoliveira/secure-auth/react/client`.

Set `AUTH_SINGLE_ACTIVE_SESSION=true` in the app `.env.local` (see [configuration-reference.md](./configuration-reference.md)).

Default (when omitted): `singleActiveSession: false`.

## Email

```typescript
email: {
  from: "Acme <noreply@acme.com>",
  provider: myEmailProvider,      // app implements EmailProvider
  templates: {
    verificationEmail: ({ appName, verifyUrl }) => ({
      subject: `Verify your ${appName} email`,
      html: `...`,
      text: `...`,
    }),
    passwordReset: ({ appName, resetUrl }) => ({ ... }),
  },
}
```

The app owns delivery credentials (`SMTP_*`, etc.). The package owns template structure and send call sites.

## Auth flow paths

```typescript
auth: {
  afterLoginPath: "/dashboard",
  afterLogoutPath: "/login",
  requireEmailVerificationBeforeSignIn: true,
}
```

Path overrides can also live under `ui.paths` (see [architecture.md](./architecture.md)).

## WebAuthn / passkeys

```typescript
webauthn: {
  rpId: "acme.com",
  rpName: "Acme Corp",
  origin: "https://app.acme.com",
}
```

## OAuth

Pass OAuth credentials in `createSecureAuth({ oauth: { google, apple, github, microsoft } })`. Mount NextAuth via `createNextAuthRouteHandlers`. Provider secrets stay in app env.

## Theme CSS

Import package styles and define theme variables in app `globals.css`:

```css
@import "tailwindcss";
@import "@tgoliveira/secure-auth/styles.css";

:root {
  --background: #faf8f5;
  --foreground: #1a1a1a;
  --primary: #4a6741;
  /* ... */
}
```

Optional `ui.cssVariables` apply at runtime via `SecureAuthUIProvider`.

## What not to customize by forking

- Drizzle auth schema (extend via separate tables instead)
- Password hashing parameters (change via documented security review)
- Rate-limit key semantics

See [security.md](./security.md) for security boundaries.
