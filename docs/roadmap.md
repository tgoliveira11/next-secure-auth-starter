# `@tgoliveira/secure-auth` — Feature Roadmap

**Current version:** `0.2.0`
**Status:** Experimental — not production-ready

This document defines the planned feature roadmap from `0.2` through `1.0`. Each version
section contains a self-contained Cursor prompt. Implement versions strictly in order —
each builds on the previous one's schema, services, and config contracts.

**Implementation order:** v0.2 → v0.3 → v1.0. Do not start a version until the previous
one has passing tests and an updated CHANGELOG entry.

---

## Feature flag policy

All roadmap features are **opt-in via environment variable**. They default to `false` (disabled)
so that upgrading the package never activates new behaviour in existing applications.

Consuming applications enable features in their `.env.local` (or environment):

| Feature | Env var | Default |
|---|---|---|
| Magic link login | `AUTH_MAGIC_LINK_ENABLED=true` | `false` |
| Security notification emails | `AUTH_SECURITY_NOTIFICATIONS_ENABLED=true` | `false` |
| HIBP breach detection | `AUTH_PASSWORD_HIBP_ENABLED=true` | `false` |
| Account lockout _(v0.3)_ | `AUTH_ACCOUNT_LOCKOUT_ENABLED=true` | `false` |
| RBAC / role-based access _(v0.3)_ | `AUTH_RBAC_ENABLED=true` | `false` |
| Organizations _(v1.0)_ | `AUTH_ORGANIZATIONS_ENABLED=true` | `false` |
| API keys _(v1.0)_ | `AUTH_API_KEYS_ENABLED=true` | `false` |

`buildSecureAuthConfigFromEnv` in consumer applications maps each env var to the corresponding
`createSecureAuth(config)` field. Route handlers check the feature flag before processing a
request and return `404` when the feature is disabled — this keeps the API surface predictable
without requiring the consumer to manage extra route files.

---

## Table of contents

- [v0.2 — Passwordless & Proactive Security](#v02--passwordless--proactive-security)
- [v0.3 — Identity Hardening](#v03--identity-hardening)
- [v1.0 — Multi-tenant & Machine Auth](#v10--multi-tenant--machine-auth)

---

---

## v0.2 — Passwordless & Proactive Security

**Goal:** Add magic link login, security notification emails, and compromised password
detection. No schema-breaking changes — all additions are additive to `accountTokens`
and `users`.

**Bump:** `0.1.25` → `0.2.0`

---

### Cursor prompt — v0.2

```
You are implementing three features in the `packages/secure-auth` package.
Implement them in the order listed. Do not move to the next feature until the
current one has tests and compiles cleanly. Read every file you intend to edit
before editing it.

The package current version is 0.1.25. Bump it to 0.2.0 in
`packages/secure-auth/package.json` only after all three features are complete
and tests pass.

---

## Feature A — Magic link (passwordless email login)

### What it is
A user enters their email on the login page and receives a one-time link. Clicking
the link authenticates them without a password. The link is valid for 15 minutes
and consumed on first use.

### Token infrastructure
The `accountTokens` table already supports typed, hashed, single-use tokens with
expiry. Reuse it with `type = "magic_link"`.

Token generation must use `crypto.randomBytes(32)` (same as existing login tokens).
Store only the SHA-256 + pepper hash (same pattern as `login-token.ts`).

### Files to create

`packages/secure-auth/src/modules/auth/services/magic-link-service.ts`
- `requestMagicLink(email: string): Promise<void>`
  - Look up user by email. If not found, return silently (no enumeration).
  - Generate token, hash it, insert into `accountTokens` with type `"magic_link"`
    and `expiresAt = now + 15 minutes`.
  - Call `emailModule.sendMagicLinkEmail(user, rawToken)`.
  - Invalidate any previous unconsumed magic link tokens for this user before
    inserting the new one (a user can only have one active magic link at a time).
- `verifyMagicLink(rawToken: string): Promise<{ userId: string } | null>`
  - Hash the token, look up in `accountTokens` where `type = "magic_link"`,
    `consumedAt IS NULL`, `expiresAt > now`.
  - If found, atomically set `consumedAt = now` and return `{ userId }`.
  - If not found or expired, return `null`.

`packages/secure-auth/src/modules/email/templates/magic-link-template.ts`
- Export `buildMagicLinkEmail(appName: string, magicLinkUrl: string): { subject, html, text }`
- The link URL is `${config.app.baseUrl}/api/auth/magic-link/verify?token=${rawToken}`
- Keep the template minimal and consistent with existing email templates.

`packages/secure-auth/src/server/routes/handlers/auth/magic-link-request.ts`
- `POST /api/auth/magic-link/request`
- Body: `{ email: string }`
- Calls `magicLinkService.requestMagicLink(email)`.
- Always returns `200 { message: "If that email is registered, a link has been sent." }`
  regardless of whether the email exists (anti-enumeration).
- Apply rate limiting: max 3 requests per email per 10 minutes.

`packages/secure-auth/src/server/routes/handlers/auth/magic-link-verify.ts`
- `POST /api/auth/magic-link/verify`
- Body: `{ token: string }`
- Calls `magicLinkService.verifyMagicLink(token)`.
- On success: create an account session (same as credentials login completion),
  call NextAuth `signIn` or issue a login token via the existing login token flow,
  return `200 { redirectTo: config.auth.afterLoginPath }`.
- On failure: return `400 { error: "Invalid or expired magic link." }`.
- If the user has 2FA enabled: do not create a session — instead create a
  2FA login challenge (same flow as credentials login) and return
  `200 { requiresTwoFactor: true }`.

### Config additions
In `createSecureAuth` config, add optional `auth.magicLink.enabled: boolean` (default `false`).
When disabled, the route handlers return `404`. Expose `magicLink.enabled` in `uiConfig`
so the `LoginPage` can conditionally render the magic link option.

### UI additions
In `packages/secure-auth/src/modules/ui/features/auth/credentials-login-form.tsx`:
- When `uiConfig.magicLink?.enabled` is true, render a "Sign in with email link" button
  below the credentials form (or replace it if the user has no password set).
- The button calls `POST /api/auth/magic-link/request` and shows a confirmation message
  matching the `CheckEmailPage` style.

### Route key
Add to `secureAuth.routes`:
- `magicLinkRequest.POST` → `POST /api/auth/magic-link/request`
- `magicLinkVerify.POST` → `POST /api/auth/magic-link/verify`

### Tests to write

`packages/secure-auth/src/modules/auth/services/__tests__/magic-link-service.test.ts`
- requestMagicLink with unknown email → returns void, no error, no email sent
- requestMagicLink with known email → inserts token, sends email
- requestMagicLink twice for same user → first token is invalidated, only second is active
- verifyMagicLink with valid token → returns userId, marks token consumed
- verifyMagicLink with already-consumed token → returns null
- verifyMagicLink with expired token → returns null
- verifyMagicLink with unknown token → returns null

`packages/secure-auth/src/server/routes/handlers/__tests__/magic-link-routes.test.ts`
- POST /request with valid email → 200 with generic message
- POST /request with unknown email → 200 with same generic message (no enumeration)
- POST /request rate limit exceeded → 429
- POST /verify with valid token and no 2FA → 200 with redirectTo
- POST /verify with valid token and 2FA enabled → 200 with requiresTwoFactor: true
- POST /verify with expired token → 400
- POST /verify with consumed token → 400
- POST /request when magicLink.enabled = false → 404

---

## Feature B — Security notification emails

### What it is
When specific high-risk account events occur, send an email to the account owner
informing them of the action. The user cannot disable these — they are security
notifications, not marketing.

### Events to notify

| Event | Trigger | Email content |
|---|---|---|
| `new_login` | Successful login from a new device or IP | Device, browser, location hint, time |
| `password_changed` | Successful password change | Time, prompt to contact support if unexpected |
| `two_factor_disabled` | 2FA successfully disabled | Time, prompt to re-enable |
| `account_email_changed` | Email address changed | Old and new email, time |
| `magic_link_used` | Magic link login completed | Device, time |

### Implementation

`packages/secure-auth/src/modules/security/notifications/security-notification-service.ts`
- `notifySecurityEvent(event: SecurityNotificationEvent): Promise<void>`
- `SecurityNotificationEvent` is a discriminated union covering the five events above.
- Each event carries: `userId`, `userEmail`, `eventType`, and event-specific metadata.
- The service calls the injected `emailModule` to send the appropriate template.
- Failures must be caught and logged — a notification failure must never interrupt
  the main auth flow. Use try/catch around the email call.

`packages/secure-auth/src/modules/email/templates/security-notification-templates.ts`
- One builder function per event type. All follow the same layout:
  subject line, brief description of what happened, device/time info where available,
  a "If this wasn't you, contact support" footer.

### Wiring
Hook into existing service methods. Do not change handler signatures — add calls
after the primary action succeeds:

- `auth-login-service.ts` → after session creation, call `notifySecurityEvent({ type: "new_login", ... })`
  Only notify on new device: compare `userAgentHash` against the last 5 sessions for
  this user. If the hash matches a recent session, skip the notification.
- `account-service.ts` or `change-password.ts` → after password update, call notify
- `two-factor-service.ts` → after 2FA disable, call notify
- `magic-link-service.ts` (Feature A) → after magic link verify, call notify

### Config additions
No new config required. Notifications are always-on when the email provider is configured.
Add an optional `auth.securityNotifications.enabled: boolean` (default `true`) for
consumers who want to opt out entirely (e.g., development environments).

### Tests to write

`packages/secure-auth/src/modules/security/notifications/__tests__/security-notification-service.test.ts`
- notifySecurityEvent password_changed → sends email with correct subject
- notifySecurityEvent two_factor_disabled → sends email
- notifySecurityEvent new_login on known device → no email sent
- notifySecurityEvent new_login on new device → sends email
- email provider throws → error is caught, function resolves (does not throw)
- securityNotifications.enabled = false → no email sent for any event

---

## Feature C — Compromised password detection (HaveIBeenPwned)

### What it is
During registration and password change, check if the password appears in known
data breaches using the HIBP k-anonymity API. The check sends only the first 5
characters of the SHA-1 hash of the password — the full password never leaves
the server.

### API
`GET https://api.pwnedpasswords.com/range/{first5HashChars}`
Returns a newline-separated list of `{suffix}:{count}` pairs. If the full hash
suffix appears in the list, the password is compromised.

### Implementation

`packages/secure-auth/src/modules/security/password-policy/hibp-checker.ts`
- `checkPasswordBreached(password: string): Promise<boolean>`
  - Compute SHA-1 of password (Node.js `crypto.createHash("sha1")`).
  - Send the first 5 hex chars to the HIBP API.
  - If the response contains the remaining suffix → return `true` (breached).
  - If the fetch fails (network error, timeout) → return `false` and log a warning.
    Never block registration due to a HIBP outage.
  - Set a 3-second timeout on the fetch.

### Wiring
In the register and change-password handlers:
- After password policy validation passes, call `checkPasswordBreached(password)`.
- If `true`, return `400 { error: "This password has appeared in a data breach. Please choose a different password." }`.
- Wrap the check in try/catch — on any error, skip the check and proceed.

### Config additions
Add `passwordPolicy.checkBreachedPasswords: boolean` (default `true`).
When `false`, skip the HIBP check entirely (for air-gapped or offline environments).

### Tests to write

`packages/secure-auth/src/modules/security/password-policy/__tests__/hibp-checker.test.ts`
Mock `fetch` in all tests — do not make real HTTP calls.
- password whose hash suffix is in the mocked response → returns true
- password whose hash suffix is NOT in the mocked response → returns false
- fetch throws network error → returns false (does not throw)
- fetch times out → returns false (does not throw)
- checkBreachedPasswords = false → returns false without calling fetch

`packages/secure-auth/src/server/routes/handlers/__tests__/register-hibp.test.ts`
- registration with breached password → 400 with breach error message
- registration with clean password → 201 (happy path unaffected)
- HIBP fetch fails → registration proceeds (fail open)

---

## Documentation to write after all three features pass

### Update `docs/configuration-reference.md`
Add rows for:
- `auth.magicLink.enabled` — boolean, default `false`
- `auth.securityNotifications.enabled` — boolean, default `true`
- `passwordPolicy.checkBreachedPasswords` — boolean, default `true`

### Update `docs/package-api.md` route map
Add:
- `magicLinkRequest.POST` | `POST` | `/api/auth/magic-link/request` | No
- `magicLinkVerify.POST` | `POST` | `/api/auth/magic-link/verify` | No

### Update `docs/security.md`
Add a section `## Compromised password detection` explaining the HIBP k-anonymity
approach and noting that the full password never leaves the server.
Add a section `## Security notifications` listing the five events and noting they
cannot be disabled by the end user.

### Update `packages/secure-auth/README.md`
Add a `## Magic link` section (same format as the CAPTCHA section).
Add a `## Security notifications` line in the Security section pointing to `security.md`.

### Update CHANGELOG
Add a `## [0.2.0]` entry with three subsections:
- `### Added` — magic link, security notifications, compromised password detection
- `### Security` — note that HIBP check is fail-open by design
```

---

---

## v0.3 — Identity Hardening

**Goal:** Add per-account lockout after repeated failed login attempts, and a
lightweight RBAC system. Requires two new DB tables: `accountLockouts` and `userRoles`.

**Prerequisite:** v0.2 complete and merged.
**Bump:** `0.2.0` → `0.3.0`

---

### Cursor prompt — v0.3

```
You are implementing two features in the `packages/secure-auth` package (currently
at v0.2.0). Implement them in the order listed. Read every file you intend to edit
before editing it. Do not move to Feature B until Feature A has passing tests.

Bump the version to 0.3.0 in `packages/secure-auth/package.json` only after both
features are complete and tests pass.

---

## Feature A — Account lockout after repeated failed logins

### What it is
After N consecutive failed login attempts for a specific email address, that account
is locked for a configurable duration. Unlike IP-based rate limiting (which already
exists), this is identity-based: it locks the account regardless of which IP the
attempts come from.

### New DB table
Add to `packages/secure-auth/src/drizzle/schema.ts`:

```typescript
export const accountLockouts = pgTable(
  "account_lockouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lastFailedAt: timestamp("last_failed_at", { withTimezone: true }),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_account_lockouts_user_id").on(table.userId),
    index("idx_account_lockouts_locked_until").on(table.lockedUntil),
  ]
);
```

Add it to `authSchema` and `AuthSchema`. Create a migration.

### Implementation

`packages/secure-auth/src/modules/auth/lib/account-lockout.ts`
- `recordFailedAttempt(userId: string, config: LockoutConfig): Promise<void>`
  - Upsert into `accountLockouts`. Increment `failedAttempts`. Set `lastFailedAt = now`.
  - If `failedAttempts >= config.maxAttempts`, set `lockedUntil = now + config.lockDuration`.
  - Reset `failedAttempts` to 0 after a successful reset (see below) — do not auto-reset
    on the lockout record itself when locked.
- `checkAccountLocked(userId: string): Promise<{ locked: boolean; unlocksAt?: Date }>`
  - Look up `accountLockouts` for this user.
  - If `lockedUntil` is in the future → return `{ locked: true, unlocksAt: lockedUntil }`.
  - If `lockedUntil` is in the past or null → return `{ locked: false }`.
- `recordSuccessfulLogin(userId: string): Promise<void>`
  - Set `failedAttempts = 0`, `lockedUntil = null`.
- `unlockAccount(userId: string): Promise<void>`
  - Admin-callable reset. Same as `recordSuccessfulLogin`.

### Config additions
Add `auth.lockout` to `createSecureAuth`:
```typescript
lockout?: {
  enabled: boolean;           // default: true
  maxAttempts: number;        // default: 5
  lockDurationMinutes: number; // default: 15
}
```

### Wiring
In `packages/secure-auth/src/modules/auth/services/auth-login-service.ts`:
- Before attempting password verification: call `checkAccountLocked(userId)`.
  If locked, return early with a `AccountLockedError` (include `unlocksAt`).
- After failed password verification: call `recordFailedAttempt(userId, config.lockout)`.
- After successful login: call `recordSuccessfulLogin(userId)`.

In the login handler, map `AccountLockedError` to:
`429 { error: "Account temporarily locked. Try again after {unlocksAt ISO string}.", lockedUntil: "<ISO>" }`

In the security notification service (v0.2 Feature B), add event `account_locked`:
notify the user by email when their account is locked (include the unlock time).

### Tests to write

`packages/secure-auth/src/modules/auth/lib/__tests__/account-lockout.test.ts`
- recordFailedAttempt below threshold → account not locked
- recordFailedAttempt at threshold → lockedUntil is set
- checkAccountLocked when locked → returns locked: true with unlocksAt
- checkAccountLocked when lock expired → returns locked: false
- checkAccountLocked when never locked → returns locked: false
- recordSuccessfulLogin → resets failedAttempts and lockedUntil
- unlockAccount → same as recordSuccessfulLogin

`packages/secure-auth/src/server/routes/handlers/__tests__/login-lockout.test.ts`
- login with correct password but locked account → 429 with lockedUntil
- login with wrong password N times → on Nth attempt, subsequent attempt returns 429
- login with correct password after lock expires → 200 (lock respected only while active)
- lockout.enabled = false → failed attempts never lock the account

---

## Feature B — Role-based access control (RBAC)

### What it is
A lightweight role system. The package defines the mechanism (assigning roles to users,
checking roles in middleware and server code). The consumer defines which roles exist.
Roles are simple strings — no permissions hierarchy in this version.

### New DB table
Add to `packages/secure-auth/src/drizzle/schema.ts`:

```typescript
export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("idx_user_roles_user_id").on(table.userId),
    uniqueIndex("idx_user_roles_user_id_role").on(table.userId, table.role),
  ]
);
```

Add to `authSchema`. Create a migration.

### Implementation

`packages/secure-auth/src/modules/account/repositories/user-role-repository.ts`
- `assignRole(userId: string, role: string, assignedBy?: string): Promise<void>`
  - Insert into `userRoles`. On conflict (userId + role already exists) do nothing.
- `revokeRole(userId: string, role: string): Promise<void>`
  - Delete from `userRoles` where `userId` and `role`.
- `getUserRoles(userId: string): Promise<string[]>`
  - Select all `role` values for `userId`.
- `getUsersWithRole(role: string): Promise<string[]>`
  - Select all `userId` values where `role = ?`. Returns user IDs.
- `hasRole(userId: string, role: string): Promise<boolean>`
  - Returns true if the record exists.

`packages/secure-auth/src/modules/account/services/role-service.ts`
- Thin service wrapping the repository. Exposed via `secureAuth.getServices().roleService`.
- Methods: `assignRole`, `revokeRole`, `getUserRoles`, `hasRole`, `getUsersWithRole`.

### Session integration
Include the user's roles in the NextAuth session JWT so they are available
client-side without an extra DB query on every request.

In `packages/secure-auth/src/modules/auth/lib/auth-options.ts`:
- In the `jwt` callback, after user lookup, call `userRoleRepository.getUserRoles(userId)`
  and add `roles: string[]` to the token.
- In the `session` callback, copy `token.roles` to `session.user.roles`.

In `packages/secure-auth/src/types/next-auth.d.ts`, extend:
```typescript
declare module "next-auth" {
  interface Session {
    user: {
      roles: string[];
    }
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    roles: string[];
  }
}
```

### Middleware helper
In `packages/secure-auth/src/next/middleware/create-secure-auth-middleware.ts`:
Add `requireRole(role: string | string[])` helper that can be used in the consumer's
`middleware.ts` to protect routes by role. If the session exists but the user lacks
the required role, redirect to `config.auth.unauthorizedRedirectPath` (new optional
config field, defaults to `"/"`).

### Route handlers for role management (admin use)
These routes have no UI — they are server-only admin endpoints.

`packages/secure-auth/src/server/routes/handlers/account/role-assign.ts`
- `POST /api/account/roles/assign`
- Body: `{ userId: string, role: string }`
- Requires authenticated session. Requires caller to have role `"admin"`.
- Returns `200` or `403`.

`packages/secure-auth/src/server/routes/handlers/account/role-revoke.ts`
- `POST /api/account/roles/revoke`
- Body: `{ userId: string, role: string }`
- Same auth requirements as assign.

`packages/secure-auth/src/server/routes/handlers/account/roles-list.ts`
- `GET /api/account/roles`
- Query: `?userId=<uuid>`
- Requires authenticated session. Returns `{ roles: string[] }`.

### Config additions
Add `auth.unauthorizedRedirectPath?: string` (default `"/"`).

### Tests to write

`packages/secure-auth/src/modules/account/repositories/__tests__/user-role-repository.test.ts`
- assignRole → role appears in getUserRoles
- assignRole duplicate → does not throw (idempotent)
- revokeRole → role removed from getUserRoles
- hasRole when role exists → true
- hasRole when role does not exist → false
- getUsersWithRole → returns correct userId list

`packages/secure-auth/src/server/routes/handlers/__tests__/role-routes.test.ts`
- POST /assign without admin role → 403
- POST /assign with admin role → 200, role assigned
- POST /revoke with admin role → 200, role removed
- GET /roles returns roles for userId
- GET /roles without auth → 401

`packages/secure-auth/src/modules/auth/lib/__tests__/session-roles.test.ts`
- JWT callback includes roles array from DB
- Session callback exposes roles from token
- User with no roles → roles: [] (not undefined)

---

## Documentation to write after both features pass

### Update `docs/configuration-reference.md`
Add rows for:
- `auth.lockout.enabled` — boolean, default `true`
- `auth.lockout.maxAttempts` — number, default `5`
- `auth.lockout.lockDurationMinutes` — number, default `15`
- `auth.unauthorizedRedirectPath` — string, default `"/"`

### Update `docs/security.md`
Add section `## Account lockout` explaining the identity-based lockout mechanism,
how it differs from IP rate limiting, and the default thresholds.

### Add `docs/rbac.md`
New document covering:
- How roles work (strings, no hierarchy)
- How to assign roles at signup or via admin routes
- How to check roles in middleware (`requireRole`)
- How to check roles in server components (`session.user.roles.includes("admin")`)
- How to check roles in route handlers (`roleService.hasRole(userId, "admin")`)
- Warning: roles are cached in the JWT — changes take effect at next token refresh
  (typically up to 30 seconds). Do not use roles for real-time access control on
  highly sensitive operations.

### Update `docs/package-api.md` route map
Add:
- `roleAssign.POST` | `POST` | `/api/account/roles/assign` | Yes
- `roleRevoke.POST` | `POST` | `/api/account/roles/revoke` | Yes
- `rolesList.GET` | `GET` | `/api/account/roles` | Yes

### Update `packages/secure-auth/README.md`
Add `## RBAC` section (same format as CAPTCHA section) pointing to `docs/rbac.md`.

### Update CHANGELOG
Add `## [0.3.0]` entry:
- `### Added` — account lockout, RBAC
- `### Security` — note that role changes are JWT-cached and eventual
```

---

---

## v1.0 — Multi-tenant & Machine Auth

**Goal:** Add organization/multi-tenancy support and API key authentication for
machine-to-machine use. This is the production-readiness milestone. Includes
schema changes, new config surface, and a significant UI addition.

**Prerequisite:** v0.3 complete and merged.
**Bump:** `0.3.0` → `1.0.0`

---

### Cursor prompt — v1.0

```
You are implementing two features in `packages/secure-auth` (currently at v0.3.0).
These are the production-readiness features for v1.0. Implement them in order.
Read every file you intend to edit before editing it.

Bump the version to 1.0.0 in `packages/secure-auth/package.json` only after both
features are complete, all tests pass, and documentation is written.

Remove "experimental — not production-ready" from `packages/secure-auth/README.md`
and `docs/security.md` as part of this version.

---

## Feature A — Organizations / multi-tenancy

### What it is
An organization is a named group that users belong to, each with a role within that
org (owner, admin, member). A user can belong to multiple organizations. Resources
in the consuming app can be scoped to an organization.

The package provides the data model, membership management APIs, and session
enrichment. It does not provide organization-scoped resource access control —
that is the consumer's responsibility using `session.user.orgId` and
`session.user.orgRole`.

### New DB tables
Add to `packages/secure-auth/src/drizzle/schema.ts`:

```typescript
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // "owner" | "admin" | "member"
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_org_members_org_user").on(table.organizationId, table.userId),
    index("idx_org_members_user_id").on(table.userId),
    index("idx_org_members_org_id").on(table.organizationId),
  ]
);

export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("member"),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_org_invitations_org_id").on(table.organizationId),
    index("idx_org_invitations_email").on(table.email),
    index("idx_org_invitations_expires_at").on(table.expiresAt),
  ]
);
```

Add all three to `authSchema`. Create migrations.

### Implementation

`packages/secure-auth/src/modules/organizations/repositories/organization-repository.ts`
- `createOrganization(name: string, slug: string): Promise<Organization>`
- `getOrganizationById(id: string): Promise<Organization | null>`
- `getOrganizationBySlug(slug: string): Promise<Organization | null>`
- `getUserOrganizations(userId: string): Promise<Array<Organization & { role: string }>>`

`packages/secure-auth/src/modules/organizations/repositories/organization-member-repository.ts`
- `addMember(organizationId: string, userId: string, role: string, invitedBy?: string): Promise<void>`
- `removeMember(organizationId: string, userId: string): Promise<void>`
- `getMember(organizationId: string, userId: string): Promise<{ role: string } | null>`
- `updateMemberRole(organizationId: string, userId: string, role: string): Promise<void>`
- `listMembers(organizationId: string): Promise<Array<{ userId: string; role: string; joinedAt: Date }>>`

`packages/secure-auth/src/modules/organizations/services/organization-service.ts`
- `createOrganization(name: string, createdByUserId: string): Promise<Organization>`
  - Generate slug from name (lowercase, hyphens, unique suffix if collision).
  - Create org. Add creator as `"owner"`.
- `inviteMember(organizationId: string, email: string, role: string, invitedByUserId: string): Promise<void>`
  - Verify caller is "owner" or "admin".
  - Generate invitation token (`crypto.randomBytes(32)`), hash it, store with 7-day expiry.
  - Send invitation email via emailModule.
- `acceptInvitation(rawToken: string, userId: string): Promise<void>`
  - Hash token, look up valid invitation. Consume it. Add user as member with invitation role.
- `removeMember(organizationId: string, userId: string, callerUserId: string): Promise<void>`
  - Verify caller is "owner" or "admin". Owners cannot be removed.
- `updateMemberRole(organizationId: string, userId: string, newRole: string, callerUserId: string): Promise<void>`
  - Verify caller is "owner". Cannot downgrade the last owner.
- `deleteOrganization(organizationId: string, callerUserId: string): Promise<void>`
  - Verify caller is "owner".

### Session enrichment
Add `orgId: string | null` and `orgRole: string | null` to the JWT/session.
The active organization is selected by the client via a cookie `active-org-id`.
In the NextAuth `jwt` callback, read `active-org-id` cookie, verify membership,
and set `orgId` + `orgRole` in the token. If cookie is absent or membership invalid,
set both to `null`.

Extend `next-auth.d.ts`:
```typescript
interface Session {
  user: {
    orgId: string | null;
    orgRole: string | null;
  }
}
```

### Route handlers
All organization routes require an authenticated session.

| Handler key | Method | Path | Required org role |
|---|---|---|---|
| `orgCreate.POST` | POST | `/api/organizations` | — (any authed user) |
| `orgList.GET` | GET | `/api/organizations` | — (returns caller's orgs) |
| `orgGet.GET` | GET | `/api/organizations/[id]` | member |
| `orgDelete.DELETE` | DELETE | `/api/organizations/[id]` | owner |
| `orgMembersList.GET` | GET | `/api/organizations/[id]/members` | member |
| `orgMemberRemove.DELETE` | DELETE | `/api/organizations/[id]/members/[userId]` | admin |
| `orgMemberRoleUpdate.PATCH` | PATCH | `/api/organizations/[id]/members/[userId]` | owner |
| `orgInviteCreate.POST` | POST | `/api/organizations/[id]/invitations` | admin |
| `orgInviteAccept.POST` | POST | `/api/organizations/invitations/accept` | — (any authed user) |

### UI additions
In `packages/secure-auth/src/modules/ui/pages/`:
- `OrganizationSettingsPage` — list members, invite by email, change roles, remove members.
  Props: `organizationId`, plus standard page props.

### Config additions
Add `organizations?: { enabled: boolean }` (default `false`).
When disabled, all org routes return `404`.

### Tests to write

`packages/secure-auth/src/modules/organizations/services/__tests__/organization-service.test.ts`
- createOrganization → org created, creator added as owner
- inviteMember by non-admin → throws authorization error
- inviteMember by admin → invitation created, email sent
- acceptInvitation with valid token → user added as member
- acceptInvitation with expired token → throws
- acceptInvitation with consumed token → throws
- removeMember last owner → throws
- updateMemberRole last owner → throws when downgrading
- deleteOrganization by non-owner → throws

`packages/secure-auth/src/server/routes/handlers/__tests__/organization-routes.test.ts`
- POST /organizations without auth → 401
- POST /organizations with auth → 201 with org object
- GET /organizations/[id]/members as non-member → 403
- GET /organizations/[id]/members as member → 200 with member list
- DELETE /organizations/[id]/members/[userId] as admin → 200
- POST /organizations/[id]/invitations as member (not admin) → 403
- POST /organizations/invitations/accept with valid token → 200

---

## Feature B — API key authentication

### What it is
Users can create named API keys scoped to their account. API keys authenticate
machine-to-machine requests to the consuming app's own backend. They are bearer
tokens: `Authorization: Bearer sk_live_<token>`. The consuming app validates them
via a helper function provided by the package.

### New DB table
Add to `packages/secure-auth/src/drizzle/schema.ts`:

```typescript
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    prefix: text("prefix").notNull(),          // first 8 chars of raw key, shown in UI
    scopes: jsonb("scopes").notNull().default([]), // string[] defined by consumer
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_api_keys_user_id").on(table.userId),
    index("idx_api_keys_key_hash").on(table.keyHash),
  ]
);
```

Add to `authSchema`. Create migration.

### Token format
`sk_live_<48 random hex chars>` (prefix `sk_live_` + `crypto.randomBytes(24).toString("hex")`).
The raw token is shown to the user exactly once (at creation). Only `keyHash`
(SHA-256 of raw token) is stored.

### Implementation

`packages/secure-auth/src/modules/api-keys/repositories/api-key-repository.ts`
- `createApiKey(userId, name, scopes, expiresAt?): Promise<{ rawToken: string; apiKey: ApiKey }>`
  - Generate raw token. Hash it. Insert record. Return both.
- `getApiKeyByHash(keyHash: string): Promise<ApiKey | null>`
- `listUserApiKeys(userId: string): Promise<ApiKey[]>`
  - Returns all non-revoked keys. Never returns `keyHash`.
- `revokeApiKey(keyId: string, userId: string): Promise<void>`
  - Sets `revokedAt`. Scoped by `userId` to prevent IDOR.
- `touchLastUsed(keyId: string): Promise<void>`
  - Updates `lastUsedAt = now`. Called on every authenticated API request.

`packages/secure-auth/src/modules/api-keys/services/api-key-service.ts`
- Thin service wrapping repository. Exposed via `secureAuth.getServices().apiKeyService`.
- `validateApiKey(rawToken: string): Promise<{ userId: string; scopes: string[] } | null>`
  - Hash token, look up, check not revoked, check not expired. Call `touchLastUsed`.
  - Returns `null` if invalid.

### Consumer-facing helper
Export from `@tgoliveira/secure-auth/next`:

```typescript
export async function getApiKeySession(
  request: Request,
  secureAuth: SecureAuth
): Promise<{ userId: string; scopes: string[] } | null>
```

Extracts `Authorization: Bearer <token>` from the request headers. Calls
`validateApiKey`. Returns the resolved session or `null`.

Usage in consumer route handler:
```typescript
import { getApiKeySession } from "@tgoliveira/secure-auth/next";
import { secureAuth } from "@/lib/secure-auth";

export async function GET(req: Request) {
  const apiSession = await getApiKeySession(req, secureAuth);
  if (!apiSession) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // apiSession.userId, apiSession.scopes
}
```

### Route handlers (for key management UI)
All require authenticated session (cookie, not API key).

| Handler key | Method | Path | Notes |
|---|---|---|---|
| `apiKeyCreate.POST` | POST | `/api/account/api-keys` | Returns rawToken once |
| `apiKeysList.GET` | GET | `/api/account/api-keys` | Never returns keyHash |
| `apiKeyRevoke.DELETE` | DELETE | `/api/account/api-keys/[id]` | Scoped by userId |

### UI additions
In `packages/secure-auth/src/modules/ui/features/settings/`:
- `ApiKeysSettings` component — list keys (name, prefix, scopes, lastUsed, expires),
  create new key with a name and optional expiry, show raw token in a copy-once dialog,
  revoke key with confirmation.

### Config additions
Add `apiKeys?: { enabled: boolean }` (default `false`).
When disabled, all API key routes return `404` and `getApiKeySession` returns `null`.

### Tests to write

`packages/secure-auth/src/modules/api-keys/services/__tests__/api-key-service.test.ts`
- validateApiKey with valid token → returns userId and scopes
- validateApiKey with revoked key → returns null
- validateApiKey with expired key → returns null
- validateApiKey with unknown token → returns null
- validateApiKey calls touchLastUsed on success

`packages/secure-auth/src/server/routes/handlers/__tests__/api-key-routes.test.ts`
- POST /api-keys without session cookie → 401
- POST /api-keys with session → 201, returns rawToken and key metadata
- GET /api-keys → 200 list, no keyHash in response
- DELETE /api-keys/[id] for another user's key → 404 (scoped by userId)
- DELETE /api-keys/[id] → 200, key revoked

`packages/secure-auth/src/modules/api-keys/services/__tests__/get-api-key-session.test.ts`
- Request with valid Bearer token → returns session
- Request with no Authorization header → returns null
- Request with invalid token → returns null
- apiKeys.enabled = false → returns null without DB call

---

## Documentation to write after both features pass

### Add `docs/organizations.md`
New document covering:
- Data model (orgs, members, invitations)
- How to create an org at user signup
- How to wire org routes
- How to protect org-scoped routes using `session.user.orgId` and `session.user.orgRole`
- Invitation flow end-to-end
- Limitations: no SSO, no SAML in this version

### Add `docs/api-keys.md`
New document covering:
- Token format and security model (shown once, stored as hash)
- How to validate API keys in consumer routes (`getApiKeySession`)
- Scopes: the package stores them, the consumer defines and enforces them
- Expiry and rotation guidance
- How to wire the UI component

### Update `docs/configuration-reference.md`
Add rows for:
- `organizations.enabled` — boolean, default `false`
- `apiKeys.enabled` — boolean, default `false`

### Update `docs/package-api.md` route map
Add all new org and API key routes with their auth requirements.

### Update `packages/secure-auth/README.md`
- Remove "experimental — not production-ready" from the header.
- Add `## Organizations` section pointing to `docs/organizations.md`.
- Add `## API keys` section pointing to `docs/api-keys.md`.
- Update versioning table: `1.0.0 → Production-ready contract`.

### Update `docs/security.md`
- Remove "experimental" maturity notice from header.
- Add section `## API key security` explaining the hash-only storage model,
  the single-display pattern for raw tokens, and scope enforcement responsibilities.

### Update CHANGELOG
Add `## [1.0.0]` entry:
- `### Added` — organizations/multi-tenancy, API key authentication
- `### Changed` — package status promoted to production-ready
- `### Security` — API keys stored as SHA-256 hash only, raw token shown once
```

---

## Implementation checklist (use before marking each version done)

> **Note:** `apps/dev-harness` does not need to be updated as part of a version
> release. It is a development tool and may lag behind intentionally. Only
> `apps/consumer-demo` is the consumer reference and must always reflect the
> current public API.

Before bumping the version and updating the changelog, verify:

- [ ] All new tests pass (`npm run test` from `packages/secure-auth`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] All new `createSecureAuth` config options have entries in `configuration-reference.md`
- [ ] All new routes appear in the route map table in `package-api.md`
- [ ] `README.md` has a section for each major feature added
- [ ] `CHANGELOG.md` has an entry for the new version
- [ ] No new direct reads of `process.env` inside the package (config must come from `createSecureAuth`)
- [ ] No new plaintext storage of tokens, passwords, or secrets
- [ ] Rate limiting applied to all unauthenticated mutation endpoints
- [ ] All new endpoints that mutate state verify session ownership before acting
- [ ] `apps/consumer-demo` updated with all new routes wired (one file per route)
- [ ] `apps/consumer-demo` updated with any new config options used in `src/lib/secure-auth.ts`
