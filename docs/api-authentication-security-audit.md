# API authentication and authorization security audit

**Scope:** `@tgoliveira/secure-auth` package routes, `apps/starter` and `apps/consumer-demo` API wrappers, middleware, NextAuth/JWT configuration, session services, rate limiting, audit logging, and CSRF posture.

**Date:** 2026-06-11  
**Package version reviewed:** `0.1.20-internal`  
**Method:** Static code review of handlers, services, middleware, and existing tests. No assumptions that routes are secure.

---

## 1. Executive summary

The package authenticates API requests primarily through **NextAuth JWT session cookies** read via `getServerSession()`. Handlers do **not** read JWT directly; middleware uses `getToken()` from `next-auth/jwt` for page routing only.

**Protected account APIs generally require a valid session** and scope mutations to the session user's ID from the JWT (not client-supplied `userId`). Ownership checks exist in session and passkey services (`revokeById(sessionId, userId)`, `findByIdForUser(credentialId, userId)`).

**Gaps found:**

| Severity | Finding |
| --- | --- |
| **Needs review** | `requireSessionUser` routes allow **pending 2FA** sessions at the handler layer (passkeys, auth-status). Middleware blocks `/api/account/*` for pending 2FA when enabled, but consumers without middleware are exposed. |
| **Needs review** | **`requireFullyAuthenticatedUser` does not enforce email verification** — only `twoFactorVerified`. Email-unverified JWT holders may call account APIs if middleware is disabled or API clients ignore redirects. |
| **Needs review** | **Register returns `409 Email already registered`** — account enumeration. |
| **Needs review** | **Passkey login options** returns distinct errors for unknown email vs account without passkey — enumeration. |
| **Needs review** | **JSON mutating routes rely on SameSite=Lax cookies** without custom CSRF tokens (industry-common for SPA same-site APIs; cross-site and same-site subdomain CSRF remain a consideration). |
| **Low** | **`GET /api/auth/login/challenge-status`** is public and reveals whether a 2FA challenge cookie exists. |
| **Low (config)** | **`GET /api/auth/login/trace`** exposes in-memory auth trace events when `debug.authTrace` is enabled. |
| **App-specific** | **Starter `GET /api/openapi`** is public and exposes the full API schema. |

No route was found that allows **unauthenticated** access to account deletion, session revocation, password change, or 2FA management. Token-based public routes (reset, verify email) use hashed opaque tokens and rate limits.

---

## 2. Overall verdict

| Area | Verdict |
| --- | --- |
| Authentication model | **Sound** — JWT session cookies + NextAuth `getServerSession` |
| Authorization / ownership | **Mostly sound** — user ID from session; DB scoping on sessions/passkeys |
| Incomplete session handling | **Partial** — middleware helps; handler layer inconsistent |
| Public route hardening | **Mixed** — forgot-password/verify resend generic; register/passkey enumerate |
| CSRF | **Acceptable with caveats** — SameSite=Lax + NextAuth CSRF for OAuth; no CSRF on JSON account APIs |
| Rate limiting | **Good coverage** on sensitive flows; gaps on a few utility endpoints |
| Audit logging | **Good** on auth, 2FA, passkeys, sessions, account deletion |
| Consumer app wrappers | **Correct** — thin delegates to `secureAuth.routes.*` |
| Test coverage | **Good** on handlers; gaps on session-tier consistency and email verification at API layer |

**Overall:** API calls **are authenticated today** for account routes via NextAuth session. Safety depends on **session cookie integrity**, **JWT callback account-session validation**, and **consistent use of `requireVerifiedFullyAuthenticatedUser`**.

## Remediation status (0.1.21-internal)

| Audit finding | Status |
| --- | --- |
| Passkey routes allowed pending 2FA | **Fixed** — `requireVerifiedFullyAuthenticatedUser` |
| Email verification not enforced on account APIs | **Fixed** — `requireEmailVerificationForAccountApis` |
| Register 409 enumeration | **Fixed** — generic 400 response + audit |
| Passkey options enumeration | **Fixed** — generic 400 response |
| JSON CSRF / SameSite-only | **Mitigated** — `requireSameOriginRequest` on mutating routes |
| Login trace exposure | **Fixed** — requires `exposeTraceRoute`; redaction added |

---

## 3. How API authentication works today

### Request flow

```text
Client request
    │
    ├─ Cookie: NextAuth session JWT (signed/encrypted by NextAuth using NEXTAUTH_SECRET)
    │           Optional: login-pending, 2FA-challenge cookies (httpOnly, package-managed)
    │
    ▼
Next.js route handler (apps/starter or consumer-demo)
    │
    └─ secureAuth.routes.<name>.<METHOD>  →  package handler
            │
            ├─ Public routes: no getServerSession
            │
            └─ Protected routes:
                   getServerSession(getAuthOptions())
                        │
                        ▼
                   JWT decoded from cookie → session callback → Session object
                        │
                        ▼
                   requireSessionUser / requireFullyAuthenticatedUser
                        │
                        ▼
                   Service layer uses session.user.id (never body.userId for authz)
```

### Where checks happen

| Layer | Role |
| --- | --- |
| **Middleware** (`createSecureAuthMiddleware`) | Optional; redirects incomplete sessions away from non-auth pages/API paths *indirectly* (redirects `/api/account` for pending 2FA / email verification because those paths are not in allowlists). Does not return 401 JSON. |
| **Route handlers** | Primary API auth gate via `requireSessionUser` or `requireFullyAuthenticatedUser`. |
| **JWT callback** (`auth-options.ts`) | Validates account session row still active; invalidates JWT if revoked; tracks `sid`, 2FA flags, email verification flag. |
| **Service layer** | Rate limits, token hashing, ownership in repositories, audit events. |

### Session helpers (`modules/auth/lib/session.ts`)

```typescript
getSessionUser()              // null if unauthenticated
requireSessionUser()          // 401 if no session.user.id
requireFullyAuthenticatedUser() // 401 if no session OR twoFactorVerified === false
```

**Not implemented:** `requireEmailVerifiedUser()`, recent-session / step-up checks.

---

## 4. Whether JWT is used and how

**Yes.** NextAuth is configured with `session: { strategy: "jwt" }` in `createAuthOptions`.

| Question | Answer |
| --- | --- |
| Where created? | NextAuth `jwt` callback on sign-in and token refresh (`auth-options.ts`) |
| Where stored? | **HttpOnly cookie** (NextAuth default naming, e.g. `next-auth.session-token` or `__Secure-next-auth.session-token` when secure) |
| Signed/encrypted? | **Yes** — HMAC/JWE via `NEXTAUTH_SECRET` (NextAuth v4 behavior) |
| Read by API handlers? | **Indirectly** via `getServerSession()` which decodes the JWT cookie |
| Read JWT directly? | **Only middleware** uses `getToken({ req, secret })` — not used in route handlers |
| Claims in JWT | `sub` (userId), `email`, `sid` (accountSessionId), `provider`, `twoFactorVerified`, `twoFactorPending`, `emailVerificationRequired`, `sessionInvalidated`, `iat` |
| Account session | `sid` created in JWT callback; `assertSessionActive(sid, userId)` on subsequent requests; revoked sessions invalidate JWT |

**API authentication = NextAuth session cookie → JWT → Session object.** There is no separate Bearer API token.

---

## 5. Cookie / session model

| Cookie | Purpose | httpOnly | secure | sameSite | path | expiry | signed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NextAuth session | Authenticated session JWT | Yes (NextAuth) | From `server.cookieSecure` / env | Lax (NextAuth default) | `/` | Session max age | Yes (NEXTAUTH_SECRET) |
| NextAuth CSRF | OAuth/sign-in CSRF | Yes | Configurable | Lax | `/` | Session | Yes |
| `{slug}.login-pending` | Short-lived login completion token | Yes | `resolveCookieSecure` | **lax** | `/` | 2FA login token TTL | Opaque token in cookie; server validates hash in DB |
| `{slug}.2fa-login-challenge` | Pending credentials/passkey 2FA challenge | Yes | `resolveCookieSecure` | **lax** | `/` | Challenge TTL | Opaque token; server validates hash in DB |
| Passkey hint cookies (client) | UX hints for passkey login | **No** (client `document.cookie`) | — | — | — | — | Not security boundaries |

Pending login/challenge cookies cannot be forged without knowing the opaque token value; server stores **hashed** tokens in the database.

---

## 6. Public route inventory

| Route | Why public | Protections | Gaps |
| --- | --- | --- | --- |
| `GET /api/auth/package-health` | Health/diagnostics | No sensitive data | None |
| `GET /api/auth/password-policy` | UI password hints | Read-only policy config | Intentional disclosure of policy rules |
| `POST /api/auth/register` | Account creation | Rate limit, optional captcha, password policy | **409 reveals registered email** |
| `POST /api/auth/login/start` | Credentials login | Rate limit (email/IP/composite), optional captcha, generic 401 | Captcha off by default |
| `POST /api/auth/login/start-form` | Password-manager form POST | Same as start + middleware rewrite | CSRF: SameSite only |
| `POST /api/auth/login/complete` | Exchange pending cookie for login token | Requires valid pending cookie | No rate limit |
| `POST /api/auth/login/verify-2fa` | Complete 2FA login | Challenge cookie/token, rate limit, audit | CSRF: SameSite only |
| `POST /api/auth/login/verify-2fa-form` | Form 2FA verify | Same | CSRF: SameSite only |
| `GET /api/auth/login/challenge-status` | UI polling | Read-only `{ pending: boolean }` | **Leaks cookie presence** |
| `GET /api/auth/login/trace` | Debug | Disabled unless `debug.authTrace` | **Must stay off in production** |
| `POST /api/auth/forgot-password` | Password reset request | Rate limit, **generic message always** | Good |
| `POST /api/auth/reset-password` | Reset with token | Rate limit, one-time token consume | `validate` action probes token validity |
| `POST /api/auth/verify-email/confirm` | Email verify | Rate limit, one-time token | Generic errors on invalid token |
| `POST /api/auth/verify-email/resend` | Resend verification | Rate limit; generic message when email in body | Session path requires auth |
| `POST /api/auth/passkey/login/options` | WebAuthn ceremony | Rate limit (IP) | **Email-specific enumeration errors** |
| `POST /api/auth/passkey/login/verify` | Passkey auth | Challenge consume, crypto verify, rate limit, audit | — |
| `GET/POST /api/auth/[...nextauth]` | OAuth + session | NextAuth CSRF, provider validation | Provider misconfiguration risk (consumer env) |
| `GET /api/openapi` (**starter only**) | API docs | — | **Full schema public** |

---

## 7. Protected route inventory

### Fully authenticated (`requireFullyAuthenticatedUser` — session + `twoFactorVerified`)

| Route | Ownership | Notes |
| --- | --- | --- |
| `GET /api/account` | session.id | Deletion requirements |
| `DELETE /api/account` | session.id | Rate limit + audit |
| `POST /api/account/change-password` | session.id | Re-auth with current password |
| `GET /api/account/2fa/status` | session.id | — |
| `POST /api/account/2fa/setup/start` | session.id | Rate limit + audit |
| `POST /api/account/2fa/setup/verify` | session.id | Rate limit + audit |
| `POST /api/account/2fa/disable` | session.id | Requires TOTP/backup code |
| `POST /api/account/2fa/backup-codes/regenerate` | session.id | Rate limit + audit |
| `GET /api/account/sessions` | session.id | Lists only user's sessions |
| `DELETE /api/account/sessions/[id]` | session.id + session row scoped | Rate limit + audit |
| `POST /api/account/sessions/ping` | session.id | Updates current session metadata |
| `POST /api/account/sessions/revoke-current` | session.id | — |
| `POST /api/account/sessions/revoke-others` | session.id + requires accountSessionId | — |
| `POST /api/account/sessions/revoke-all` | session.id | Signs user out |

### Authenticated session only (`requireSessionUser` — allows pending 2FA)

| Route | Risk if pending 2FA allowed |
| --- | --- |
| `GET /api/account/auth-status` | Reads email, provider, verification state |
| `GET /api/account/passkeys` | Lists passkeys |
| `POST /api/account/passkeys/register` | **Can register new passkeys** |
| `DELETE /api/account/passkeys/[id]` | **Can delete passkeys** |

### Pending-login / incomplete session (by design)

| Route | Required state |
| --- | --- |
| `POST /api/auth/login/verify-2fa-oauth` | NextAuth session with pending 2FA (OAuth path) |
| `POST /api/auth/login/complete` | Pending login cookie (no NextAuth session required) |
| `POST /api/auth/login/verify-2fa` | Valid 2FA challenge cookie/token |

---

## 8. Route classification table

| Route | Method | Handler | Public / protected | Required auth state | JWT/session | Cookies | Rate limit | CSRF | Ownership | Audit | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/auth/package-health` | GET | `create-routes.ts` | Public | public | None | None | No | N/A | N/A | No | **Safe** | Version probe |
| `/api/auth/password-policy` | GET | `auth/password-policy.ts` | Public | public | None | None | No | N/A | N/A | No | **Safe** | By design |
| `/api/auth/register` | POST | `auth/register.ts` | Public | public | None | None | Yes | SameSite | N/A | No | **Needs review** | 409 enumeration; captcha optional |
| `/api/auth/login/start` | POST | `login-start.ts` | Public | public | None | Sets challenge | Yes | SameSite | N/A | On failure | **Safe** | Generic 401 |
| `/api/auth/login/start-form` | POST | `auth/login-start-form.ts` | Public | public | None | Sets cookies | Yes | SameSite | N/A | On failure | **Safe** | Form POST |
| `/api/auth/login/complete` | POST | `auth/login-complete.ts` | Public | pending-login | None | Reads pending | No | SameSite | N/A | No | **Safe** | Cookie-gated |
| `/api/auth/login/verify-2fa` | POST | `auth/login-verify-2fa.ts` | Public | pending-2FA | None | Challenge | Yes | SameSite | N/A | Yes | **Safe** | — |
| `/api/auth/login/verify-2fa-form` | POST | `auth/login-verify-2fa-form.ts` | Public | pending-2FA | None | Challenge | Yes | SameSite | N/A | Yes | **Safe** | — |
| `/api/auth/login/verify-2fa-oauth` | POST | `auth/login-verify-2fa-oauth.ts` | Protected | pending-2FA | Session | None | Yes | SameSite | userId from session | Yes | **Safe** | OAuth 2FA completion |
| `/api/auth/login/challenge-status` | GET | `auth/login-challenge-status.ts` | Public | public | None | Reads challenge | No | N/A | N/A | Trace only | **Needs review** | Leaks pending state |
| `/api/auth/login/trace` | GET | `auth/login-trace.ts` | Public* | public | None | None | No | N/A | N/A | No | **Needs review** | *Only if debug enabled |
| `/api/auth/forgot-password` | POST | `auth/forgot-password.ts` | Public | public | None | None | Yes | SameSite | N/A | Yes | **Safe** | Generic response |
| `/api/auth/reset-password` | POST | `auth/reset-password.ts` | Public | token-required | None | None | Yes | SameSite | Token scoped | Yes | **Safe** | validate probes token |
| `/api/auth/verify-email/confirm` | POST | `auth/verify-email-confirm.ts` | Public | token-required | None | None | Yes | SameSite | Token scoped | Yes | **Safe** | — |
| `/api/auth/verify-email/resend` | POST | `auth/verify-email-resend.ts` | Mixed | public or authenticated | Optional session | None | Yes | SameSite | Email path generic | Yes | **Safe** | Dual mode |
| `/api/auth/passkey/login/options` | POST | `auth/passkey-login-options.ts` | Public | public | None | None | Yes (IP) | SameSite | N/A | No | **Needs review** | Email enumeration |
| `/api/auth/passkey/login/verify` | POST | `auth/passkey-login-verify.ts` | Public | public | None | Sets challenge/pending | Yes | SameSite | Crypto + DB | Yes | **Safe** | — |
| `/api/auth/[...nextauth]` | GET/POST | `create-nextauth-route-handlers.ts` | Public | provider-callback | JWT issued | Session+CSRF | Provider-dependent | NextAuth CSRF | Provider | Yes | **Safe** | Consumer env critical |
| `/api/account` | GET | `account/account.ts` | Protected | fully-authenticated | Session | Session | No | SameSite | session.id | No | **Needs review** | No email-verify check |
| `/api/account` | DELETE | `account/account.ts` | Protected | fully-authenticated | Session | Session | Yes | SameSite | session.id | Yes | **Needs review** | No email-verify check |
| `/api/account/auth-status` | GET | `account/auth-status.ts` | Protected | authenticated | Session | Session | No | SameSite | session.id | No | **Needs review** | Allows pending 2FA |
| `/api/account/change-password` | POST | `account/change-password.ts` | Protected | fully-authenticated | Session | Session | Yes | SameSite | session.id | Yes | **Needs review** | No email-verify check |
| `/api/account/passkeys` | GET | `account/passkeys-list.ts` | Protected | authenticated | Session | Session | No | SameSite | session.id | No | **Needs review** | Pending 2FA allowed |
| `/api/account/passkeys/register` | POST | `account/passkeys-register.ts` | Protected | authenticated | Session | Session | Yes | SameSite | session.id | Yes | **Needs review** | Pending 2FA allowed |
| `/api/account/passkeys/[id]` | DELETE | `account/passkeys-delete.ts` | Protected | authenticated | Session | Session | No* | SameSite | session.id + DB | Yes | **Needs review** | Pending 2FA allowed |
| `/api/account/2fa/status` | GET | `account/two-factor-status.ts` | Protected | fully-authenticated | Session | Session | No | SameSite | session.id | No | **Safe** | — |
| `/api/account/2fa/setup/start` | POST | `account/two-factor-setup-start.ts` | Protected | fully-authenticated | Session | Session | Yes | SameSite | session.id | Yes | **Safe** | — |
| `/api/account/2fa/setup/verify` | POST | `account/two-factor-setup-verify.ts` | Protected | fully-authenticated | Session | Session | Yes | SameSite | session.id | Yes | **Safe** | — |
| `/api/account/2fa/disable` | POST | `account/two-factor-disable.ts` | Protected | fully-authenticated | Session | Session | Yes | SameSite | session.id | Yes | **Safe** | Requires code |
| `/api/account/2fa/backup-codes/regenerate` | POST | `account/two-factor-backup-codes.ts` | Protected | fully-authenticated | Session | Session | Yes | SameSite | session.id | Yes | **Safe** | — |
| `/api/account/sessions` | GET | `account/sessions-list.ts` | Protected | fully-authenticated | Session | Session | No | SameSite | session.id | No | **Safe** | — |
| `/api/account/sessions/[id]` | DELETE | `account/sessions-delete.ts` | Protected | fully-authenticated | Session | Session | Yes | SameSite | session.id + DB | Yes | **Safe** | — |
| `/api/account/sessions/ping` | POST | `account/sessions-ping.ts` | Protected | fully-authenticated | Session | Session | No | SameSite | session.id | No | **Safe** | — |
| `/api/account/sessions/revoke-current` | POST | `account/sessions-revoke-current.ts` | Protected | fully-authenticated | Session | Session | No | SameSite | session.id | Yes | **Safe** | — |
| `/api/account/sessions/revoke-others` | POST | `account/sessions-revoke-others.ts` | Protected | fully-authenticated | Session | Session | Yes | SameSite | session.id | Yes | **Safe** | Requires sid |
| `/api/account/sessions/revoke-all` | POST | `account/sessions-revoke-all.ts` | Protected | fully-authenticated | Session | Session | Yes | SameSite | session.id | Yes | **Safe** | — |
| `/api/openapi` | GET | `apps/starter` only | Public | public | None | None | No | N/A | N/A | No | **Needs review** | Starter-only; schema exposure |

\* Passkey delete rate limit enforced in service layer on register; delete path has no explicit route-level rate limit.

---

## 9. JWT / session flow diagrams (text)

### 1. Credentials login

```text
POST /api/auth/login/start (email+password)
  → rate limit → verify password → optional 2FA challenge cookie
POST /api/auth/login/verify-2fa (if 2FA)
  → consume challenge → issue loginToken → set pending login cookie
POST /api/auth/login/complete
  → read pending cookie → return loginToken JSON → clear cookie
Client: signIn("login-token", { loginToken })
  → NextAuth credentials provider consumes token (one-time DB row)
  → jwt callback: sub, sid, twoFactorVerified=true, account session created
  → session cookie set
```

### 2. OAuth login

```text
GET/POST /api/auth/[...nextauth] → provider redirect
  → signIn callback (user create/link, email verify for OAuth)
  → jwt callback: if 2FA enabled → twoFactorPending=true, twoFactorVerified=false
  → session cookie (incomplete until 2FA)
POST /api/auth/login/verify-2fa-oauth (requires session)
  → verify TOTP → return upgradeToken
Client: session.update({ twoFactorUpgradeToken })
  → jwt callback consumes upgrade → twoFactorVerified=true
```

### 3. Passkey login

```text
POST /api/auth/passkey/login/options → WebAuthn options + stored challenge
POST /api/auth/passkey/login/verify → crypto verify → loginToken OR 2FA challenge
  → same completion path as credentials
```

### 4. Passkey + TOTP

Same as passkey; if 2FA enabled, verify returns `requiresTwoFactor` + challenge cookie instead of loginToken.

### 5. OAuth + TOTP

OAuth session with `twoFactorPending` → `/api/auth/login/verify-2fa-oauth` → session upgrade.

### 6. API request authentication

```text
Request + session cookie
  → getServerSession()
  → NextAuth decodes JWT
  → jwt callback runs (account session active? password rotated? touch session)
  → session callback maps to Session
  → handler require* helper
  → service uses session.user.id
```

### 7. Session revocation

```text
DELETE /api/account/sessions/:id → revokeById(id, userId) in DB
  → audit session_revoked
On next JWT refresh: assertSessionActive fails → sessionInvalidated → empty session

Sign out: NextAuth signOut event → revokeOnSignOut(userId, sid)
```

### 8. Single active session (optional)

When `sessions.singleActiveSession` enabled:

```text
Fully authenticated login → enforceSingleActiveSessionOnLogin
  → revokeAllExcept(currentSid) → audit sessions_revoked_on_login
2FA upgrade completion also triggers enforcement when enabled
```

### Validation layers

| Layer | Validated on API request |
| --- | --- |
| JWT signature | Yes (NextAuth) |
| NextAuth session | Yes (`getServerSession`) |
| Account session DB row | Yes (JWT callback, throttled touch) |
| Pending login/2FA cookies | Separate opaque tokens in DB |
| Client-supplied userId | **Not used for authorization** on account routes |

---

## 10. CSRF assessment

| Route class | Mechanism | Risk |
| --- | --- | --- |
| NextAuth OAuth/sign-in POST | NextAuth CSRF token | Low |
| JSON account APIs (`fetch` + cookies) | **SameSite=Lax** session cookie | Low for cross-origin; consider same-site subdomain attacks |
| Form login/2FA (`start-form`, `verify-2fa-form`) | SameSite=Lax + middleware rewrite | Medium for classic CSRF if attacker can trigger same-site form POST |
| Token-based public POST (reset, verify) | No session cookie required | Low ( attacker needs token) |

**No custom CSRF tokens** on package JSON endpoints. This matches typical same-origin SPA patterns but is a documented limitation.

**Recommendations:** Document SameSite requirement; consider `SameSite=strict` for high-security deployments; optional CSRF header for mutating account routes.

---

## 11. Rate-limit assessment

| Operation | Routes | Policy (default) |
| --- | --- | --- |
| `auth.register` | register | 10/hour/IP |
| `auth.login` | login/start, start-form | 20/15min email, IP, composite |
| `auth.forgot_password` | forgot-password | 5/hour email+IP |
| `auth.reset_password` | reset-password | 10/15min/IP |
| `auth.verify_email_*` | confirm, resend | 5–20 per policy |
| `two_factor.login_verify` | verify-2fa, verify-2fa-oauth | 10/15min |
| `two_factor.*` (account) | setup, disable, backup | 3–10 per policy |
| `passkey.login` | options, verify | 20/15min |
| `passkey.register` | passkeys/register | 10/hour |
| `account.delete` | DELETE /account | 3/hour |
| `account.password_change` | change-password | 10/15min |
| `account.session_revoke*` | sessions routes | 3–20 per policy |

**Missing / weak:**

- `GET /api/auth/login/challenge-status` — no limit (low impact)
- `POST /api/auth/login/complete` — no limit (cookie-gated)
- `GET /api/account/*` read endpoints — no limit (acceptable)
- Default store **`memory`** — not shared across instances; use `rateLimit.store: "postgres"` in production

---

## 12. Audit-log assessment

| Event | Logged |
| --- | --- |
| login_success / login_failure | Yes |
| two_factor_login_* / setup / disable / backup | Yes |
| passkey_login_* / passkey_added / passkey_removed | Yes |
| email_verification_* / password_reset_* / password_change_* | Yes |
| session_created / session_revoked / bulk revokes | Yes |
| account_deletion_requested | Yes |

**Gaps:** `GET` account routes and `sessions/ping` do not audit (read-only, acceptable).

---

## 13. Authorization / ownership assessment

| Resource | Check | Verdict |
| --- | --- | --- |
| Account deletion | `session.id` only | **Safe** |
| Change password | `session.id` only | **Safe** |
| Sessions list/revoke | `revokeById(id, userId)` | **Safe** |
| Passkeys delete | `findByIdForUser(id, userId)` | **Safe** |
| Passkey registration verify | Challenge bound to `userId` in consume | **Safe** |
| Passkey login options `userId` body | Used to narrow WebAuthn allowCredentials only; **not auth** | **Safe** (enumeration issue only) |
| 2FA setup/disable | `session.id` | **Safe** |

**No handler trusts client `userId` for authorization** on account mutations.

---

## 14. Known safe routes

All **`requireFullyAuthenticatedUser`** account routes with service-layer ownership and rate limits on mutations.

Public auth flows with generic errors: **forgot-password**, **verify-email resend (email path)**, **credentials login failure**.

**NextAuth** routes with CSRF and provider validation.

---

## 15. Routes needing review

1. **`POST /api/auth/register`** — 409 account enumeration  
2. **`POST /api/auth/passkey/login/options`** — distinct 404/validation errors per email  
3. **Passkey account routes** — `requireSessionUser` allows pending 2FA  
4. **`GET /api/account/auth-status`** — pending 2FA allowed  
5. **All `requireFullyAuthenticatedUser` routes** — no `emailVerificationRequired` enforcement at API layer  
6. **`GET /api/auth/login/challenge-status`** — information disclosure  
7. **`GET /api/auth/login/trace`** — when debug enabled  
8. **`GET /api/openapi`** (starter) — public schema  
9. **JSON CSRF posture** — SameSite-only  

---

## 16. Unsafe routes

**None identified** that allow completely unauthenticated access to sensitive account mutations.

The closest concerns are **authorization-tier inconsistencies** (pending 2FA on passkey management) rather than missing authentication entirely.

---

## 17. Immediate fixes recommended

Do **not** implement until instructed; listed for prioritization:

1. **Add `requireFullyAuthenticatedUser` to passkey account routes** (or new helper that rejects pending 2FA and unverified email).  
2. **Add email verification check** to session helpers used by account APIs when `emailVerificationRequired` is true on session.  
3. **Change register duplicate response** to generic 200/201 style message (like forgot-password).  
4. **Normalize passkey login options errors** to a single generic message when email is provided.  
5. **Ensure `debug.authTrace` is false** in production configs (document + starter env example).  
6. **Protect or remove starter `/api/openapi`** in production (auth or disable).  
7. **Document postgres rate-limit store** requirement for multi-instance deployments.

---

## 18. Missing tests

| Area | Existing | Gap |
| --- | --- | --- |
| Route handler auth | `account-*-routes.test.ts`, `auth-login-routes.test.ts`, etc. | No test asserting pending 2FA **rejected** on passkey register |
| Session helpers | Mocked in route tests | No dedicated tests for email verification tier |
| JWT callback | `auth-options-single-active-session.test.ts` | Email verification + session invalidation integration |
| Middleware | `secure-auth-middleware.test.ts` | API JSON response behavior (redirect vs 401) |
| CSRF | None | Form route CSRF documented only |
| Register enumeration | `register-route.test.ts` | Should assert desired generic behavior after fix |
| Import boundaries | consumer-demo `import-boundaries.test.ts` | Starter equivalent recommended |

---

## 19. Recommended fixes (phased)

### Phase 1 — Handler consistency (low risk)

- Unify passkey routes on `requireFullyAuthenticatedUser`
- Add `requireEmailVerifiedSessionUser()` and use on account routes when policy enabled
- Generic register / passkey-options error responses

### Phase 2 — Defense in depth

- Optional `requireAccountSessionId` on sensitive revokes (already on revoke-others)
- Rate limit `login/complete` and `challenge-status`
- CSRF token or `Origin`/`Referer` validation helper for JSON POST

### Phase 3 — Consumer hardening docs

- Middleware recommended for all production apps
- `rateLimit.store: "postgres"`
- Production checklist for `NEXTAUTH_SECRET`, `cookieSecure`, WebAuthn origin

---

## 20. Recommended tests

1. Pending 2FA session → `POST /api/account/passkeys/register` → **401**  
2. Email-unverified session (policy on) → `GET /api/account` → **403**  
3. Register duplicate email → generic response (no 409)  
4. Passkey options unknown email → generic error  
5. Revoked account session → account API → **401** after JWT refresh  
6. Middleware disabled → handler-only auth still blocks unauthenticated  

---

## 21. Consumer app review

### Starter (`apps/starter`)

- All auth/account routes: **thin wrappers** → `secureAuth.routes.*` ✅  
- **Extra route:** `GET /api/openapi` — public, not from package  
- Middleware: uses `createSecureAuthMiddleware` ✅  

### Consumer-demo (`apps/consumer-demo`)

- All routes: thin wrappers ✅  
- Middleware: uses package helper ✅  
- No extra API routes ✅  

### Wrapper pattern (correct)

```typescript
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.loginStart.POST;
```

No bypass of package auth checks found.

---

## 22. Client repo guidance

For consumer applications integrating `@tgoliveira/secure-auth`:

1. **Use package route wrappers only** — export handlers from `secureAuth.routes.*`; do not reimplement auth logic.  
2. **Do not import package internals** (`packages/secure-auth/src/...`).  
3. **Do not trust client-supplied `userId`** in custom routes; use `getServerSession` / package services.  
4. **Enable middleware** (`@tgoliveira/secure-auth/next/middleware`) for incomplete-session routing and guest-page redirects.  
5. **Configure env at app boundary** (package never reads env):
   - `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
   - `server.cookieSecure: true` in production
   - WebAuthn `rpId` / `origin`
   - `rateLimit.store: "postgres"` for multi-instance
   - `debug.authTrace: false` in production
6. **Keep package updated** — auth behavior is centralized in the package.  
7. **Do not duplicate** session tier checks unless overriding intentionally.  
8. **Validate OAuth callback URLs** and captcha keys in deployment.  
9. **Protect custom API routes** you add beyond the package with the same session helpers or fully authenticated equivalent.

---

## 23. Test inventory summary

| Location | Coverage |
| --- | --- |
| `packages/secure-auth/src/server/routes/handlers/__tests__/*` | Per-route happy/error paths, mocked session helpers |
| `packages/secure-auth/src/modules/auth/lib/__tests__/auth-options*.test.ts` | JWT callback, single active session |
| `packages/secure-auth/src/test/secure-auth-middleware.test.ts` | Middleware redirects |
| `apps/starter/src/test/unit/middleware.test.ts` | Starter middleware integration |
| `apps/consumer-demo/src/test/import-boundaries.test.ts` | Public entry imports only |

---

## Appendix: Answers to audit questions

| # | Question | Answer |
| --- | --- | --- |
| 1 | JWT for API auth? | **Yes** — via NextAuth session cookie; handlers use `getServerSession`, not raw JWT |
| 2 | Public APIs? | See §6; intentional for login/register/recovery/WebAuthn/OAuth |
| 3 | Authenticated APIs? | Account routes; see §7 |
| 4 | Fully authenticated? | Most account mutations; passkey routes exception |
| 5 | Cookie reliance? | Session + pending login + 2FA challenge; see §5 |
| 6 | CSRF? | NextAuth CSRF for OAuth; SameSite for JSON APIs; see §10 |
| 7 | Thin wrappers? | **Yes** in starter and consumer-demo |
| 8 | Authorization beyond auth? | **Yes** — DB scoping by userId from session |
| 9 | Rate limits? | Broad coverage; see §11 |
| 10 | Audit logs? | Sensitive ops logged; see §12 |
| 11 | Route gaps? | See §15–16 |
