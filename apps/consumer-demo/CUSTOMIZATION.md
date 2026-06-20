# Consumer Demo — Customization Reference

This document distinguishes between what comes from `@tgoliveira/secure-auth`
and what the consumer application owns. If you're building your own app on top
of the package, this is your reference for what to keep, what to replace, and
what to wire up yourself.

---

## What the package provides (zero config required)

These are all ready-to-use — import and render, nothing else needed.

| Export | Where used |
|---|---|
| `LoginPage` | `app/login/page.tsx` |
| `RegisterPage` | `app/register/page.tsx` |
| `ForgotPasswordPage` | `app/forgot-password/page.tsx` |
| `ResetPasswordPage` | `app/reset-password/page.tsx` |
| `CheckEmailPage` | `app/check-email/page.tsx` |
| `VerifyEmailPage` | `app/verify-email/page.tsx` |
| `LoginTwoFactorPage` | `app/login/2fa/page.tsx` |
| `LoginCompletePage` | `app/login/complete/page.tsx` |
| `AccountSettingsPage` | `app/(app)/settings/account/page.tsx` |
| `SecuritySettingsPage` | `app/(app)/settings/security/page.tsx` |
| `SessionsSettingsPage` | `app/(app)/settings/sessions/page.tsx` |
| `DashboardPlaceholderPage` | `app/(app)/dashboard/page.tsx` |
| `AccountDeletedPage` | `app/account-deleted/page.tsx` |
| `SecureAuthUIProvider` | `src/components/providers.tsx` |
| `createSecureAuthMiddleware` | `src/middleware.ts` |
| `createSecureAuth` | `src/lib/secure-auth.ts` |
| Drizzle schema | `src/lib/auth-schema.ts` |
| All API route handlers | `src/app/api/**` |

Visual primitives (`Button`, `Card`, `Input`, `Alert`, …) are also available
from `@tgoliveira/secure-auth/react` and used throughout this app.

---

## What this app owns (consumer customization)

### `src/app/page.tsx` — Public landing page
The marketing home page is entirely consumer-owned. It uses `Button` and `Card`
from the package for visual consistency, but the layout, copy, and feature list
are not part of the package.

**To replace:** swap the entire file with your own marketing/home page.

---

### `src/app/(app)/layout.tsx` — Authenticated area shell
Route group layout that wraps `/dashboard` and `/settings/*` with the `AppNav`
top bar. The package does not provide an app shell — it only provides page
content components.

**To replace:** swap `AppNav` with your own navigation or remove the layout
entirely and render nav inside each page.

---

### `src/components/app-nav.tsx` — Top navigation bar
Authenticated navigation bar with:
- App brand mark (logo initials + name)
- Links to Dashboard / Account / Security / Sessions (via `useUiPaths` from package)
- "Sign out" button (via `signOut` from `next-auth/react`)

Uses these package exports:
- `useUiPaths()` — resolves configured route paths
- `Button` — visual primitive

**To replace:** build your own nav component. The package exports `useUiPaths`
so you can resolve the correct paths from the global `SecureAuthUIProvider`
config without hardcoding them.

---

### `src/components/providers.tsx` — React context providers
Wires `SessionProvider` (next-auth) and `SecureAuthUIProvider` together.
The `refetchInterval` for session revocation polling is read from
`uiConfig.sessionPolicy.revocationPollIntervalSeconds` — this value comes from
config and is not hardcoded.

**To keep:** this exact pattern is the recommended integration shape.

---

### `src/app/globals.css` — Design tokens
CSS custom properties (`--primary`, `--border`, `--radius`, etc.) consumed by
package UI components. You **must** define these — the package ships no
`:root` defaults of its own.

```css
/* Minimum required variables */
--background, --foreground
--primary, --primary-hover
--muted, --border
--card, --card-muted
--danger, --danger-muted
--success, --success-muted
--warning, --warning-muted
--info, --info-muted
--radius, --shadow-sm, --ring
```

**To replace:** define your own values for the same variable names.
The full set is in `src/app/globals.css`.

---

### `src/lib/secure-auth.ts` — Package instantiation
Creates the single `secureAuth` instance. The `ui.paths` and `ui.messages`
blocks here are consumer overrides — everything else is driven by env vars via
`buildSecureAuthConfigFromEnv`.

**To customize:** add or change entries in `ui.paths` and `ui.messages`.
Paths must match the actual Next.js route files.

---

### `src/lib/env/secure-auth-from-env.ts` — Environment variable mapping
Maps `.env.local` variables to `createSecureAuth(config)` fields. The
`buildSecureAuthConfigFromEnv` helper is consumer-owned — the package only
defines the config shape, not how env vars get mapped to it.

**To customize:** add new env var keys for any config field you want to
control at deploy time.

---

### `src/lib/email-provider.ts` — Email delivery
Console-only implementation that logs emails to stdout instead of sending them.
Replace with a real provider (Resend, Postmark, SES, Nodemailer) for production.

**Interface required by the package:**
```ts
{ send(message: { to, subject, html, text }): Promise<void> }
```

---

### `src/lib/db.ts` — Database client
Drizzle ORM instance using the schema from the package. The schema is owned by
the package; the connection string and client setup are consumer-owned.

---

## v0.2 feature flags (opt-in via env)

All v0.2 features default to **off**. Enable per feature in `.env.local`:

```env
AUTH_MAGIC_LINK_ENABLED=true
AUTH_SECURITY_NOTIFICATIONS_ENABLED=true
AUTH_PASSWORD_HIBP_ENABLED=true
```

See `CUSTOMIZATION.md` in `docs/roadmap.md` for the full feature flag table.
