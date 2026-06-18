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

1. **Upgrade** `@tgoliveira/secure-auth` to `>= 0.1.20-internal`.
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
