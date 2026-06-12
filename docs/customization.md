# Customization

Consumers customize behavior through `createSecureAuth(config)` and `SecureAuthUIProvider` — no file copying required.

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
  passwordPolicy: { enforcement: "warn" },
});
```

`uiConfig` includes resolved `paths`, `messages`, `appSlug`, `appName`, and `passwordPolicy`. It contains **no secrets** and **no React nodes** — safe to pass from server layout to client provider.

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

Pass OAuth credentials in `createSecureAuth({ oauth: { google, apple, microsoft } })`. Mount NextAuth via `createNextAuthRouteHandlers`. Provider secrets stay in app env.

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
