# Current product surface — `@tgoliveira/secure-auth`

Living inventory of what the package exposes today. Update this file when exports, routes, migrations, or shipped/planned status changes.

**Package version (manifest):** `0.4.0`  
**Last reviewed:** 2026-06-30

## Status legend

| Status | Meaning |
| --- | --- |
| **shipped** | In `main`, documented, intended for consumers |
| **opt-in** | Shipped but disabled by default (`config.*.enabled`) |
| **planned** | Documented roadmap, not yet in package |

## Published npm entry points

| Export | Status | Purpose |
| --- | --- | --- |
| `@tgoliveira/secure-auth` | shipped | `createSecureAuth`, types, `safeLogger` |
| `@tgoliveira/secure-auth/next` | shipped | Next.js helpers, `createNextAuthRouteHandlers` |
| `@tgoliveira/secure-auth/next/middleware` | shipped | `createSecureAuthMiddleware` (Edge-safe) |
| `@tgoliveira/secure-auth/react` | shipped | UI pages, provider, admin pages |
| `@tgoliveira/secure-auth/react/client` | shipped | Client-only React entry |
| `@tgoliveira/secure-auth/drizzle/schema` | shipped | `authSchema`, table definitions |
| `@tgoliveira/secure-auth/email` | shipped | Email provider types / helpers |
| `@tgoliveira/secure-auth/client` | shipped | Client utilities |
| `@tgoliveira/secure-auth/client/password-policy` | shipped | Password policy (browser-safe) |
| `@tgoliveira/secure-auth/outpost` | shipped | Opt-in `OutpostEmailProvider` adapter |
| `@tgoliveira/secure-auth/styles.css` | shipped | Tailwind source for package UI |

**Not published:** deep `src/**` imports, `createRoutes`, `createAuthServices`, legacy server entry points.

## SQL migrations (tarball `migrations/`)

| Migration | Status | Contents |
| --- | --- | --- |
| `0000_optimal_warpath.sql` | shipped | Core auth schema |
| `0001_passkey_vault_unlock_enabled.sql` | shipped | `passkey_credentials.vault_unlock_enabled` |
| `0002_v0_3_admin_platform.sql` | shipped | Admin platform tables + user profile/role columns |

## Route keys (`secureAuth.routes.*`)

Consumers wire thin App Router handlers. Canonical consumer-demo mapping: `scripts/consumer-demo-route-registry.mjs`.

### Auth (public)

| Key | Methods | Status |
| --- | --- | --- |
| `health` | GET | shipped |
| `loginStart` | POST | shipped |
| `loginStartForm` | POST | shipped |
| `loginComplete` | POST | shipped |
| `loginVerify2fa` | POST | shipped |
| `loginVerify2faForm` | POST | shipped |
| `loginVerify2faOauth` | POST | shipped |
| `loginChallengeStatus` | GET | shipped |
| `loginTrace` | GET | shipped (debug-gated) |
| `register` | POST | shipped |
| `forgotPassword` | POST | shipped |
| `resetPassword` | POST | shipped |
| `passwordPolicy` | GET | shipped |
| `verifyEmailConfirm` | POST | shipped |
| `verifyEmailResend` | POST | shipped |
| `magicLinkRequest` | POST | opt-in (`auth.magicLink.enabled`) |
| `magicLinkVerify` | GET, POST | opt-in |
| `passkeyLoginOptions` | POST | shipped |
| `passkeyLoginVerify` | POST | shipped |
| `nextAuth` | GET, POST | shipped |

### Account (authenticated)

| Key | Methods | Status |
| --- | --- | --- |
| `account` | GET, DELETE | shipped |
| `accountAuthStatus` | GET | shipped |
| `accountProfile` | GET, POST | opt-in (`profile.enabled`) |
| `changePassword` | POST | shipped |
| `passkeysList` | GET | shipped |
| `passkeyRegister` | POST | shipped |
| `passkeyById` | DELETE | shipped |
| `sessionsList` | GET | shipped |
| `sessionById` | DELETE | shipped |
| `sessionsPing` | POST | shipped |
| `sessionsRevokeCurrent` | POST | shipped |
| `sessionsRevokeOthers` | POST | shipped |
| `sessionsRevokeAll` | POST | shipped |
| `twoFactorStatus` | GET | shipped |
| `twoFactorSetupStart` | POST | shipped |
| `twoFactorSetupVerify` | POST | shipped |
| `twoFactorDisable` | POST | shipped |
| `twoFactorBackupCodesRegenerate` | POST | shipped |

### Admin (authenticated + `role = admin`)

| Key | Methods | Status |
| --- | --- | --- |
| `adminUsers` | GET | opt-in (`admin.enabled`) |
| `adminUserById` | POST | opt-in |
| `adminLocks` | GET, POST | opt-in |
| `adminWaitlist` | GET, POST | opt-in |
| `adminInvites` | GET, POST, DELETE | opt-in |
| `adminApiKeys` | GET, POST, DELETE | opt-in (`apiKeys.enabled`) |
| `adminConfig` | GET, POST, DELETE | opt-in |

## UI pages (`@tgoliveira/secure-auth/react`)

| Page | Status |
| --- | --- |
| Login, Register, Forgot/Reset password | shipped |
| Check email, Verify email | shipped |
| Login 2FA, Login complete | shipped |
| Account / Security / Sessions settings | shipped |
| Waitlist pending | opt-in (`invites.requireApproval`) |
| Admin panel + Users, Waitlist, Invites, Locks, API Keys, Config | opt-in (`admin.enabled`) |
| Dashboard placeholder | shipped (consumer replaces) |

## Feature flags (config)

| Config path | Default | Status |
| --- | --- | --- |
| `admin.enabled` | `false` | shipped |
| `invites.enabled` | `false` | shipped |
| `apiKeys.enabled` | `false` | shipped |
| `profile.enabled` | `false` | shipped |
| `accountLockout.enabled` | `false` | shipped |
| `auth.magicLink.enabled` | `false` | shipped |
| `auth.securityNotifications.enabled` | `true` | shipped |
| `passwordPolicy.checkBreachedPasswords` | `true` | shipped |

## Monorepo apps (not published)

| App | Role |
| --- | --- |
| `apps/consumer-demo` | Canonical consumer reference |
| `apps/dev-harness` | Internal harness (Swagger, extra tooling) |

## Planned (roadmap — not in surface above)

See [roadmap.md](./roadmap.md) for future work. Do not list items here unless they are explicitly deferred from a shipped release.
