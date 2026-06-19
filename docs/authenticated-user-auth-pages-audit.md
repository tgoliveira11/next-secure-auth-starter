# Authenticated user access to auth pages — audit

**Date:** 2026-06-18  
**Package version audited:** `@tgoliveira/secure-auth@0.1.19-internal`  
**Scope:** Behavior when a user with a **valid, fully authenticated session** (2FA complete, email verification satisfied) navigates to package auth pages in consumer apps.

This document reflects **observed implementation**, not desired product behavior. No code changes were made as part of this audit.

---

## Executive summary

| Question | Answer |
| --- | --- |
| Does the package auto-redirect authenticated users away from `/login`? | **No** |
| Does it render auth pages anyway? | **Yes** (option **B**) |
| Is behavior consistent across auth pages? | **Mostly yes** — all listed pages render without a guest guard; special cases below |
| Is there an `authenticatedRedirect` config? | **No** |
| Closest existing redirect config | `auth.afterLoginPath` / `paths.afterLogin` (post-**successful** login only) |
| Where is redirect logic today? | **Incomplete-auth middleware** in starter only; **protected-page** guards on account/dashboard pages; **not** on guest/auth pages |
| Acceptable for production UX? | **Generally no** for login/register/forgot-password; token/flow pages need exceptions |
| Recommended owner for a fix | **Package** (reusable guest guard) + **optional consumer middleware** for defense in depth |

---

## Investigation method

1. **Source audit** — all package auth pages, `SecureAuthUIProvider`, NextAuth options, login/register/2FA handlers, starter middleware, consumer-demo app wiring.
2. **Automated tests** — `apps/dev-harness/src/test/unit/middleware.test.ts` (middleware gating for pending 2FA and email verification only).
3. **Manual browser verification** — attempted against `http://localhost:3001` during this audit; the page did not render in the automation environment (empty document). **Live manual confirmation per auth method was not completed in this session.** Findings below are code-derived unless noted.

---

## Answers to investigation questions

### 1. `/login` — fully authenticated user

**Behavior:** The login page **renders normally**. No `useSession` check, no redirect.

- User sees credentials form, passkey section, and OAuth buttons.
- Submitting credentials starts a **new** login flow (POST → `/api/auth/login/start-form` via starter middleware rewrite) and may issue new pending cookies and a new session on completion.
- Passkey / OAuth actions on the page are still enabled and can start a new sign-in.

**Classification:** **B — renders the page anyway.**

### 2. `/register` — fully authenticated user

**Behavior:** Register page **renders normally**. Registration form and OAuth sign-up are available.

- Successful registration API call returns `409` if email already exists; UI shows error.
- If registration succeeded (new email), page auto-signs-in via `login-token` and redirects to `afterLoginPath`.

**Classification:** **B — renders the page anyway.**

### 3. `/forgot-password` — fully authenticated user

**Behavior:** Forgot-password page **renders normally**. User can submit email; API runs regardless of session.

**Classification:** **B — renders the page anyway.**

### 4. `/reset-password` — fully authenticated user

**Behavior:** Page **renders** when `?token=` is present and valid. No session check.

- Token validation runs client-side via `accountAuthApi.validateResetToken`.
- Password update works independent of current session (intended for recovery).
- Without token → invalid state UI.

**Classification:** **B — renders** (correct for token-based recovery).

### 5. `/login/2fa` — fully authenticated user

**Behavior:** Page **renders normally** for both `mode=credentials` and OAuth (default) modes.

- **Credentials mode:** Form POST requires a **2FA challenge cookie** from a prior credentials/passkey login start. Without it, server redirects back to login with error (handler), but the page itself still displays.
- **OAuth mode:** `OAuthTwoFactorForm` requires `session.user.id`. A fully authenticated user **has** a session, so the form is submittable. API may accept a valid TOTP and redirect to `afterLoginPath` even when 2FA was already satisfied — confusing UX, not a hard block.

**Classification:** **B — renders**; **partial** server rejection only on credentials POST without challenge.

### 6. `/login/complete` — fully authenticated user

**Behavior:** Page mounts and immediately runs `POST /api/auth/login/complete`.

- Without a **pending login cookie** (normal for an already signed-in user), API returns **401** → UI shows error: *"Your sign-in session expired. Please sign in again."* with link back to login.
- Page shell still renders briefly (loading → error).

**Classification:** **B with error state** — not a redirect to dashboard.

### 7. Consistency across auth pages?

| Page | Fully authenticated GET | Notes |
| --- | --- | --- |
| `LoginPage` | Renders | No guard |
| `RegisterPage` | Renders | No guard |
| `ForgotPasswordPage` | Renders | No guard |
| `ResetPasswordPage` | Renders (with token) | By design |
| `LoginTwoFactorPage` | Renders | No guard |
| `LoginCompletePage` | Renders → error without pending cookie | Flow-specific |
| `VerifyEmailPage` | Renders / runs verification | Token-driven |
| `CheckEmailPage` | Renders | No guard |

**Protected pages** (contrast): `DashboardPlaceholderPage`, `SecuritySettingsPage`, `AccountSettingsPage`, `SessionsSettingsPage` redirect **unauthenticated** users **to** login — inverse guard only.

### 8. Is there already a redirect mechanism?

**Yes, but not for “guest-only” routes:**

| Mechanism | Direction | When |
| --- | --- | --- |
| Starter `middleware.ts` | → `/login/2fa` | JWT has `twoFactorPending` and path not in allowlist |
| Starter `middleware.ts` | → `/check-email` | JWT has `emailVerificationRequired` |
| Account/dashboard pages | → `/login` | `useSession` status `unauthenticated` |
| Login success handlers | → `afterLoginPath` / `/login/complete` / `/login/2fa` | After successful login steps |
| `LoginCompletePage` | → `afterLoginPath` | After pending login cookie consumed |
| `SingleActiveSessionMonitor` | → `/login` | Session revoked elsewhere (sign-out + replace) |

**No mechanism redirects authenticated users away from login/register.**

### 9. Where is redirect logic implemented?

| Layer | Guest redirect (auth → app) | Protected redirect (app → auth) |
| --- | --- | --- |
| Package pages | **No** | **Yes** (settings, dashboard) |
| Package hooks | **No** | **No** |
| Package middleware helper | **No** | **No** |
| Package route handlers | **No** (login/register always accepted) | Partial (401 on APIs) |
| Consumer apps | **No** (starter middleware does not cover this) | Starter middleware (2FA/email gates only) |
| `SecureAuthUIProvider` | **No** | Session monitor only |

### 10. Risks

| Risk | Severity | Notes |
| --- | --- | --- |
| Session confusion | Low–medium | Existing session remains until a new `signIn` completes; user may not realize they started a second login |
| Accidental re-login | Medium | Credentials/passkey/OAuth on `/login` while signed in can create a **new** session row; with `singleActiveSession`, other devices may be revoked |
| Infinite redirects | **None observed** | No guest redirect loop exists today |
| Broken OAuth flows | Low | OAuth from `/login` while authenticated starts a new provider flow; may be surprising but not blocked |
| Broken passkey flows | Low | Same as credentials — new login attempt allowed |
| Broken 2FA flows | Low | Incomplete 2FA sessions are **forced to** `/login/2fa` by starter middleware; fully authenticated users visiting `/login/2fa` see a stale step |

---

## Per-page detail

### `LoginPage`

**File:** `packages/secure-auth/src/modules/ui/pages/login-page.tsx`

- Client component; no `useSession`.
- Composes `CredentialsLoginForm` + `LoginPasskeySection`.
- `afterLoginPath` is passed to passkey/OAuth children for **post-login** navigation only.

### `RegisterPage`

**File:** `packages/secure-auth/src/modules/ui/pages/register-page.tsx`

- No session guard.
- On success may `signIn("login-token")` and `router.push(destination)`.

### `ForgotPasswordPage`

**File:** `packages/secure-auth/src/modules/ui/pages/forgot-password-page.tsx`

- Stateless relative to session.

### `ResetPasswordPage`

**File:** `packages/secure-auth/src/modules/ui/pages/reset-password-page.tsx`

- Token-gated; session-agnostic.

### `LoginTwoFactorPage`

**File:** `packages/secure-auth/src/modules/ui/pages/login-two-factor-page.tsx`

- No session-based redirect on mount.

### `LoginCompletePage`

**File:** `packages/secure-auth/src/modules/ui/pages/login-complete-page.tsx`

- Always attempts login completion; depends on pending cookie from prior step.

### `VerifyEmailPage` / `CheckEmailPage`

**Files:** `verify-email-page.tsx`, `check-email-page.tsx`

- No authenticated-user redirect.
- Verify flow uses email token API on mount.

### `SecureAuthUIProvider`

**File:** `packages/secure-auth/src/modules/ui/secure-auth-ui-provider.tsx`

- Supplies paths, copy, password policy, captcha public config.
- Optionally mounts `SingleActiveSessionMonitor` — does **not** gate auth routes.

### NextAuth integration

**File:** `packages/secure-auth/src/modules/auth/lib/auth-options.ts`

- `pages.signIn` → configured login path (default `/login`).
- `auth.afterLoginPath` is **not** used as a NextAuth `callbacks.redirect` — no global “already signed in” handling.
- No `authenticatedRedirect` in `SecureAuthConfig` (`packages/secure-auth/src/core/types.ts`).

### Starter consumer app

**Middleware:** `apps/dev-harness/src/middleware.ts`

- Rewrites POST `/login` and `/login/2fa` to API handlers.
- Redirects **incomplete** sessions (pending 2FA, email verification).
- Does **not** redirect complete sessions away from `/login`, `/register`, or `/forgot-password`.

**Nav:** `apps/dev-harness/src/components/layout/nav.tsx`

- Hides “Sign in” when `status === "authenticated"` — reduces link clicks but **does not block URL navigation**.
- Homepage (`apps/dev-harness/src/app/page.tsx`) still shows Create account / Sign in links regardless of session.

**Auth route pages:** Thin re-exports of package pages (e.g. `apps/dev-harness/src/app/(auth)/login/page.tsx`) — no extra guards.

### Consumer-demo app

- **No `middleware.ts`.**
- **No nav** hiding login when authenticated; homepage always links to `/login` and `/register`.
- Same package page behavior as starter for GET requests.

---

## Configurability review

### Exists today

| Config | Location | Purpose |
| --- | --- | --- |
| `auth.afterLoginPath` | `createSecureAuth(config)` | Destination after **successful** login (also `paths.afterLogin` in UI config) |
| `auth.afterLogoutPath` | `createSecureAuth(config)` | Consumer sign-out targets (not auto-enforced on pages) |
| `ui.paths.*` | `createSecureAuth(config).uiConfig` | Route path overrides |
| Per-page `afterLoginPath` prop | `LoginPage`, `RegisterPage`, etc. | Override post-login destination |

### Does not exist

- `authenticatedRedirect`
- `guestOnlyRoutes`
- `authenticatedLandingPage`
- `dashboardPath` (use `afterLoginPath` / `/dashboard` convention instead)

### Proposed configuration (future)

Add to `SecureAuthConfig.auth` (or `ui.guestRoutes`):

```ts
{
  /** Where to send users who hit guest-only pages while fully authenticated. Default: afterLoginPath. */
  authenticatedRedirectPath?: string;
  /** When false, package pages do not auto-redirect (consumer handles middleware). Default: true. */
  redirectAuthenticatedFromGuestPages?: boolean;
  /** Guest-only paths; defaults to login, register, forgot-password. */
  guestOnlyPaths?: string[];
}
```

Expose resolved values via `uiConfig.paths` for client guards and an optional `createAuthMiddleware()` helper in `@tgoliveira/secure-auth/next`.

---

## Manual verification matrix (starter / consumer-demo)

**Status:** Not fully executed in browser during this audit (automation could not load app UI). Expected behavior from code for a **fully authenticated** session:

| Auth method used to sign in | Visit `/login` | Visit `/register` | Visit `/forgot-password` | Notes |
| --- | --- | --- | --- | --- |
| Credentials | Renders | Renders | Renders | Same — no method-specific guest guard |
| OAuth | Renders | Renders | Renders | OAuth buttons still active on login/register |
| Passkey | Renders | Renders | Renders | Passkey button still active |
| Passkey + TOTP | Renders | Renders | Renders | After 2FA complete, same as credentials |
| OAuth + TOTP | Renders | Renders | Renders | After OAuth 2FA upgrade, same as OAuth |

**Incomplete session (starter only):**

| State | Visit `/dashboard` | Visit `/login` |
| --- | --- | --- |
| Pending 2FA | Redirect → `/login/2fa` | Allowed |
| Email verification required | Redirect → `/check-email?...` | Allowed |

Consumer-demo lacks middleware → incomplete sessions may reach dashboard until client/API checks fail.

---

## Recommended product behavior

Aligned with stated expectation:

| Route | Recommended |
| --- | --- |
| `/login` | Redirect fully authenticated users → `authenticatedRedirectPath` (default `afterLoginPath`) |
| `/register` | Redirect fully authenticated users → same |
| `/forgot-password` | Redirect fully authenticated users → same (or account settings) |
| `/reset-password?token=` | **Allow** (recovery while signed in is valid) |
| `/verify-email?token=` | **Allow** (verification action) |
| `/check-email` | Redirect if already verified + authenticated; allow if verification pending |
| `/login/2fa` | Allow only when `twoFactorPending`; else redirect to dashboard or login |
| `/login/complete` | Allow only when pending login cookie exists; else redirect |

---

## Implementation plan (future — not in scope of this audit)

### Phase 1 — Package client guard (low risk)

1. Add `useRedirectIfAuthenticated({ redirectTo, enabled })` in `packages/secure-auth/src/modules/ui/hooks/`.
2. Wrap `LoginPage`, `RegisterPage`, `ForgotPasswordPage` with guard (configurable via prop `redirectIfAuthenticated?: boolean`, default `true`).
3. Resolve `redirectTo` from prop → `paths.afterLogin` → `DEFAULT_AUTH_PATHS.afterLogin`.
4. Show `LoadingState` while `useSession` is `loading` to avoid flash.

### Phase 2 — Flow-specific pages

1. `LoginTwoFactorPage` — redirect unless session is pending 2FA (read `session.twoFactorPending`).
2. `LoginCompletePage` — skip auto-fetch redirect if no pending cookie; optional redirect if already authenticated.
3. `CheckEmailPage` — redirect authenticated + verified users.

### Phase 3 — Optional middleware helper

1. Export `createSecureAuthMiddleware(config)` from `@tgoliveira/secure-auth/next` mirroring starter’s 2FA/email gates **plus** guest-route redirect using JWT claims (`twoFactorVerified`, `emailVerificationRequired`).
2. Document starter migration.

### Phase 4 — Tests & docs

1. Component tests: authenticated `useSession` → `router.replace`.
2. Middleware tests: guest routes with complete JWT.
3. Update `docs/customization.md`, `docs/package-api.md`.

### Effort estimate

| Phase | Effort |
| --- | --- |
| Phase 1 (login/register/forgot) | **0.5–1 day** |
| Phase 2 (2FA/complete/check-email) | **0.5–1 day** |
| Phase 3 (middleware helper) | **1 day** |
| Phase 4 (tests + docs) | **0.5 day** |
| **Total** | **~2–3.5 days** |

---

## Backward compatibility

- Apps that **rely** on authenticated users reaching `/login` (e.g. “switch account” without sign-out) would need `redirectIfAuthenticated={false}` or a dedicated `/login?switch=1` escape hatch.
- Consumer-demo and starter today **depend** on no redirect — adding default redirect is a **behavior change**; ship behind config default `true` with changelog, or default `false` for one minor release.
- OAuth `signIn` from bookmarked `/login` while authenticated is currently possible — redirect reduces duplicate session creation.

---

## Security & UX implications

**UX**

- Authenticated users can land on login via bookmark, email link, or marketing homepage — confusing (“why am I signing in again?”).
- Starter nav hides sign-in when authenticated; homepage and consumer-demo do not.

**Security**

- Re-login while authenticated is not blocked — can rotate session and trigger `singleActiveSession` revocation on other devices.
- No credential leakage from merely **viewing** login while authenticated.
- Forgot-password while authenticated is odd but low risk (generic response message).

---

## Key code references

| Area | Path |
| --- | --- |
| Login page (no guard) | `packages/secure-auth/src/modules/ui/pages/login-page.tsx` |
| Register page | `packages/secure-auth/src/modules/ui/pages/register-page.tsx` |
| Protected dashboard guard | `packages/secure-auth/src/modules/ui/pages/dashboard-placeholder-page.tsx` |
| UI path defaults (`afterLogin`) | `packages/secure-auth/src/modules/ui/pages/types.ts` |
| Public UI config builder | `packages/secure-auth/src/core/ui-config.ts` |
| NextAuth options | `packages/secure-auth/src/modules/auth/lib/auth-options.ts` |
| Credentials login POST | `packages/secure-auth/src/modules/auth/lib/credentials-login-start-handler.ts` |
| Login complete API | `packages/secure-auth/src/server/routes/handlers/auth/login-complete.ts` |
| Starter middleware | `apps/dev-harness/src/middleware.ts` |
| Middleware tests | `apps/dev-harness/src/test/unit/middleware.test.ts` |
| Starter nav (hides sign-in only) | `apps/dev-harness/src/components/layout/nav.tsx` |

---

## Conclusion

**Actual behavior today:** **B — package auth pages render for authenticated users.** There is **no** package-level or starter-level redirect away from login/register/forgot-password when the session is complete. Redirect machinery exists only for **incomplete** auth (2FA pending, email verification) in starter middleware, and for **unauthenticated** access to protected pages.

**Acceptability:** Reasonable for a low-level auth kit, **not ideal** for polished consumer apps.

**Recommended direction:** Add a configurable **guest-route guard** in the package (client-first), extend flow-specific pages, optionally ship middleware helper for starter-style apps.
