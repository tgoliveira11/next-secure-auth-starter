# Customization

Consumers customize behavior through `createSecureAuth(config)` — no file copying required.

## UI

```typescript
ui: {
  brand: {
    name: "Acme Corp",
    logo: <AcmeLogo />,           // optional React node
  },
  paths: {
    login: "/login",
    register: "/register",
    account: "/settings/account",
    security: "/settings/security",
  },
  messages: {
    "login.title": "Sign in to Acme",
    "register.submit": "Create account",
  },
  cssVariables: {
    "--sa-brand": "#2563eb",
    "--sa-radius": "0.5rem",
  },
}
```

Import defaults from `@tgoliveira/secure-auth/react` and compose with app layout.

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

## WebAuthn / passkeys

```typescript
webauthn: {
  rpId: "acme.com",
  rpName: "Acme Corp",
  origin: "https://app.acme.com",
}
```

## OAuth (NextAuth)

OAuth provider secrets stay in the **app** env and `auth-options` wiring. The package exposes auth services; provider configuration remains app-level until fully migrated.

## What not to customize by forking

- Drizzle auth schema (extend via separate tables instead)
- Password hashing parameters (change via documented security review)
- Rate-limit key semantics
