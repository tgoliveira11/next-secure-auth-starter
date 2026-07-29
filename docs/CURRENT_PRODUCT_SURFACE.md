# Current product surface — `@tgoliveira/secure-auth`

Living inventory of what the package exposes today. Update this file when exports, routes, migrations, or shipped/planned status changes.

**Package version:** see [`packages/secure-auth/package.json`](../packages/secure-auth/package.json)
**Last reviewed:** 2026-07-29

## Status legend

| Status | Meaning |
| --- | --- |
| **shipped** | In `main`, documented, intended for consumers |
| **opt-in** | Shipped but disabled by default (`config.*.enabled`) |
| **planned** | Documented roadmap, not yet in package |

## Published npm entry points

| Export | Status | Purpose |
| --- | --- | --- |
| `@tgoliveira/secure-auth` | shipped | `createSecureAuth`, types, `safeLogger`, manifest-derived `SECURE_AUTH_PACKAGE_VERSION` |
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
| `0003_user_preferences.sql` | shipped | Per-user key-value preferences (`user_preferences`) — see [user-preferences.md](./user-preferences.md) |
| `0004_outgoing_william_stryker.sql` | shipped | Monotonic passkey assertion CAS epoch (`passkey_credentials.counter_revision`) |
| `0005_nasty_slipstream.sql` | opt-in | Session-bound, single-use portable vault grant and receipt operations (`webauthn_broker_operations`) |

## Route keys (`secureAuth.routes.*`)

Consumers wire thin App Router handlers. Canonical consumer-demo mapping: `scripts/consumer-demo-route-registry.mjs`.

### Auth (public)

| Key | Methods | Status |
| --- | --- | --- |
| `health` | GET | shipped — reports the build-embedded package manifest version |
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
| `passkeyEnableSignIn` | POST | shipped — explicit vault-only credential promotion |
| `passkeyPortableVaultGrantOptions` | POST | opt-in (`webauthn.portableVaultGrants.enabled`) — exact-credential UV ceremony |
| `passkeyPortableVaultGrantVerify` | POST | opt-in — issue short-lived ES256 broker grant |
| `passkeyPortableVaultGrantFinalize` | POST | opt-in — verify and single-use consume broker completion receipt |
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
| `accountPreferences` | GET, PATCH | opt-in (`preferences.enabled`) — [guide](./user-preferences.md) |
| `accountPreferencesByKey` | GET, PUT, DELETE | opt-in (`preferences.enabled`) |
| `accountPreferencesExport` | GET | opt-in (`preferences.enabled`) — GDPR self-export |

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

Locks, Waitlist, API Keys, and Config expose explicit pending, ready, ready-empty, and error UI states. Failed initial reads do not fall through to empty/final cards or zero counts.

## Feature flags (config)

| Config path | Default | Status |
| --- | --- | --- |
| `admin.enabled` | `false` | shipped |
| `invites.enabled` | `false` | shipped |
| `apiKeys.enabled` | `false` | shipped |
| `profile.enabled` | `false` | shipped |
| `preferences.enabled` | `false` | shipped — [guide](./user-preferences.md) |
| `accountLockout.enabled` | `false` | shipped |
| `auth.magicLink.enabled` | `false` | shipped |
| `auth.securityNotifications.enabled` | `true` | shipped |
| `passwordPolicy.checkBreachedPasswords` | `true` | shipped |
| `webauthn.getLoginAuthenticationExtensions` | unset | opt-in — bounded server-only WebAuthn extension composition after account resolution |
| `webauthn.originAliasPolicy` | `"apex-www"` | shipped — set `"none"` for exact canonical-origin verification |
| `webauthn.portableVaultGrants.enabled` | `false` | opt-in — independent portable vault broker authorization; see [portable-vault-grants.md](./portable-vault-grants.md) |

Passkey login, exact-credential capability proofs, and portable grant assertions share a shipped
local-first presentation policy: normalized `internal`/`hybrid` transports plus advisory WebAuthn
Level 3 hints, with required UV and hybrid fallback preserved.

## Client exports (`@tgoliveira/secure-auth/client`)

| Symbol | Status |
| --- | --- |
| `preferencesApi` | shipped (requires `preferences.enabled`) |
| `sanitizeWebAuthnResponseForSecureAuthServer` | shipped — recursively removes documented browser-only PRF-derived results before serialization |
| `passkeyAccountApi.enableSignInOptions` / `enableSignInVerify` | shipped |
| `passkeyPortableVaultGrantApi` | opt-in — grant options/verify and broker receipt finalization |
| `requestPortableVaultGrant` | opt-in — dedicated browser WebAuthn grant ceremony with sensitive-extension cleanup |

## Client exports (`@tgoliveira/secure-auth/react/client`)

| Symbol | Status |
| --- | --- |
| `useUserPreferences`, `useUserPreference` | shipped (requires `preferences.enabled`) |
| `mergeGuestPreferences`, `useMergeGuestPreferences` | shipped |
| `usePreferencesEnabled` | shipped |
| `registerAccountPasskey`, `AccountPasskeyRegistrationHooks` | shipped — optional browser composition |
| `signInWithPasskey`, `PasskeyLoginHooks` | shipped — server-composed browser options plus typed fully-authenticated integration result |
| `PasskeyLoginIntegrationCompletion`, `PasskeyLoginIntegrationResult` | shipped — generic completed/action-required/failed post-login contract |
| `enableAccountPasskeySignIn` | shipped |
| `requestPortableVaultGrant` | opt-in (`webauthn.portableVaultGrants.enabled`) |
| `PasskeySettings.allowSignInCapabilityPromotion` / `SecuritySettingsPage.allowPasskeySignInCapabilityPromotion` | shipped — explicit opt-in, default false |

## Public UI config (`@tgoliveira/secure-auth/react`, `@tgoliveira/secure-auth/next`)

| Symbol / field | Status |
| --- | --- |
| `SecureAuthUIPublicConfig.oauthProviderIds` | shipped — optional provider-ID-only list; current `createSecureAuth` always populates it |
| `OAuthProviderId` | shipped — `google \| apple \| github \| azure-ad` |

## Planned client exports

| App | Role |
| --- | --- |
| `apps/consumer-demo` | Canonical consumer reference |
| `apps/dev-harness` | Internal harness (Swagger, extra tooling) |

## Planned (roadmap — not in surface above)

See [roadmap.md](./roadmap.md) for other future work.
