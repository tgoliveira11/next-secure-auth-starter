# Consumer migration: authenticated-user auth page redirects

Guidance for AI agents and developers updating client apps that consume `@tgoliveira/secure-auth`.

## What changed

Starting in **`0.1.20-internal`**, the package redirects **fully authenticated** users away from guest-only auth pages by default:

- `/login`
- `/register`
- `/forgot-password`

Flow-specific pages now behave safely:

| Route | Behavior |
| --- | --- |
| `/login` | Authenticated → `authenticatedRedirectPath` |
| `/register` | Authenticated → `authenticatedRedirectPath` |
| `/forgot-password` | Authenticated → `authenticatedRedirectPath` |
| `/reset-password?token=` | **Allowed** (token recovery) |
| `/verify-email?token=` | **Allowed** (token verification) |
| `/check-email` | Allowed when verification pending; redirect when verified |
| `/login/2fa` | Allowed only for pending 2FA; redirect when fully authenticated |
| `/login/complete` | Completes pending login; redirects if already authenticated |

Optional middleware helper: `createSecureAuthMiddleware` from `@tgoliveira/secure-auth/next/middleware` (defense in depth; client guards remain required for correctness).

## What client repos should do

1. **Upgrade** `@tgoliveira/secure-auth` to `>= 0.1.20` (or `@latest`).
2. **Ensure** root layout wraps pages with `SecureAuthUIProvider config={secureAuth.uiConfig}`.
3. **Map env** into `createSecureAuth(config)` at the app boundary (package never reads env).
4. **Remove duplicate** custom guest-route redirects if the package now handles them.
5. **Optionally adopt** `createSecureAuthMiddleware` for server-side redirects (recommended for starter-style apps).

## Optional env variables

```env
AUTH_REDIRECT_AUTHENTICATED_FROM_GUEST_PAGES=true
AUTH_AUTHENTICATED_REDIRECT_PATH=/dashboard
```

Map in `buildSecureAuthConfigFromEnv()` (see `apps/starter` / `apps/consumer-demo`).

## Example config

```ts
export const secureAuth = createSecureAuth({
  auth: {
    afterLoginPath: "/dashboard",
    redirectAuthenticatedFromGuestPages: true,
    authenticatedRedirectPath: "/dashboard",
    // ...nextAuthSecret, afterLogoutPath, etc.
  },
});
```

Resolved values are exposed in `secureAuth.uiConfig.auth`.

## Page-level opt-out

For account-switching or intentional re-login while signed in:

```tsx
<LoginPage redirectIfAuthenticated={false} />
```

Global opt-out:

```ts
createSecureAuth({
  auth: {
    redirectAuthenticatedFromGuestPages: false,
  },
});
```

## Middleware example (optional)

```ts
import {
  createSecureAuthMiddleware,
  buildMiddlewareConfigFromUi,
} from "@tgoliveira/secure-auth/next/middleware";
import { secureAuth } from "@/lib/secure-auth";

export const middleware = createSecureAuthMiddleware({
  ...buildMiddlewareConfigFromUi(secureAuth.uiConfig, process.env.NEXTAUTH_SECRET!),
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

Starter and consumer-demo use env-derived middleware config — see their `src/middleware.ts`.

## Validation checklist

- [ ] Authenticated user visiting `/login` redirects to dashboard (or custom path)
- [ ] Authenticated user visiting `/register` redirects
- [ ] Authenticated user visiting `/forgot-password` redirects
- [ ] Reset password with valid `?token=` still works when signed in
- [ ] Verify email with valid `?token=` still works when signed in
- [ ] Pending 2FA user can reach `/login/2fa`
- [ ] Authenticated user visiting `/login/complete` does **not** see expired-session error
- [ ] No redirect loops between dashboard and login
- [ ] Credentials, OAuth, passkey, and 2FA login flows still work

## Warning

- Do **not** import package internals (`packages/secure-auth/src/...`).
- Do **not** duplicate auth-page redirect logic unless intentionally overriding package behavior.
- Use public exports: `@tgoliveira/secure-auth/react`, `@tgoliveira/secure-auth/next`, `@tgoliveira/secure-auth/next/middleware`.

---

## API security hardening notes for consumer agents

Starting in **`0.1.21-internal`**, package API handlers enforce their own auth tiers. Consumer middleware is **defense-in-depth only** — not the primary security layer.

### 1. Package version requirement

Upgrade `@tgoliveira/secure-auth` to **`>= 0.1.21`** (or `@latest`).

### 2. Route wrappers

Use `secureAuth.routes.*` for all auth/account APIs. Do not reimplement passkey, 2FA, session, password, or account deletion logic.

### 3. Middleware is defense-in-depth only

Package handlers enforce auth tiers. Keep middleware for UX and early redirects, but do not rely on it as the only protection.

### 4. Passkey management

Passkey list/register/delete require **fully authenticated and verified** users. Pending 2FA users should be routed to `/login/2fa`, not passkey settings.

### 5. Email verification

Handle **403** responses with `Email verification is required before continuing.` Ensure `/check-email` and verify-email flows remain wired.

Config:

```env
EMAIL_VERIFICATION_REQUIRE_FOR_ACCOUNT_APIS=true
```

### 6. Generic public errors

Register and passkey login options may return generic errors. Do not depend on exact strings like “email already registered” or “no passkey found”.

### 7. Same-origin protection

Configure correct origins:

```env
APP_BASE_URL=https://app.example.com
NEXTAUTH_URL=https://app.example.com
AUTH_SAME_ORIGIN_PROTECTION_ENABLED=true
# AUTH_ALLOWED_ORIGINS=https://preview.example.com
```

Mutating account APIs reject cross-origin requests when protection is enabled.

### 8. Debug trace

Never enable in production:

```env
AUTH_TRACE=false
AUTH_DEBUG_EXPOSE_TRACE_ROUTE=false
```

Both flags must be true for `GET /api/auth/login/trace` to return data.

### 9. Reference implementations

Compare your app with `apps/starter` and `apps/consumer-demo` (updated in `0.1.21-internal`).

### 10. API security validation checklist

- [ ] Package version `>= 0.1.21`
- [ ] `.env` has correct `APP_BASE_URL` / `NEXTAUTH_URL`
- [ ] Route wrappers delegate to `secureAuth.routes.*`
- [ ] `SecureAuthUIProvider` uses `secureAuth.uiConfig`
- [ ] Pending 2FA users cannot access passkey settings APIs
- [ ] Verified users can manage passkeys
- [ ] Register UI handles generic duplicate response
- [ ] Passkey login handles generic errors
- [ ] Mutating account APIs work from same origin
- [ ] Cross-origin mutating calls are rejected (when protection enabled)
- [ ] Debug trace disabled in production

### 11. Migration risk note

This is a security hardening release. Expect changes to error messages, passkey accessibility during pending 2FA, email verification requirements on account APIs, and cross-origin behavior for mutating routes.

See [api-authentication-security-audit.md](api-authentication-security-audit.md) for the full audit and remediation details.
