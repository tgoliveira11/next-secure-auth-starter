/**
 * Canonical route registry for consumer-demo synchronization.
 *
 * Keys must match exactly the keys returned by secureAuth.routes.
 * When a new route is added to create-routes.ts, add it here too.
 * The sync script will generate the route.ts file automatically.
 *
 * path: relative to apps/consumer-demo/src/app/api/
 * methods: HTTP methods exported by the route file
 */
export const ROUTE_REGISTRY = [
  // Auth — public
  { key: "health", path: "auth/package-health", methods: ["GET"] },
  { key: "loginStart", path: "auth/login/start", methods: ["POST"] },
  { key: "loginStartForm", path: "auth/login/start-form", methods: ["POST"] },
  { key: "loginComplete", path: "auth/login/complete", methods: ["POST"] },
  { key: "loginVerify2fa", path: "auth/login/verify-2fa", methods: ["POST"] },
  { key: "loginVerify2faForm", path: "auth/login/verify-2fa-form", methods: ["POST"] },
  { key: "loginVerify2faOauth", path: "auth/login/verify-2fa-oauth", methods: ["POST"] },
  { key: "loginOauth2faComplete", path: "auth/login/oauth-2fa-complete", methods: ["POST"] },
  { key: "loginChallengeStatus", path: "auth/login/challenge-status", methods: ["GET"] },
  { key: "loginTrace", path: "auth/login/trace", methods: ["GET"] },
  { key: "register", path: "auth/register", methods: ["POST"] },
  { key: "forgotPassword", path: "auth/forgot-password", methods: ["POST"] },
  { key: "resetPassword", path: "auth/reset-password", methods: ["POST"] },
  { key: "passwordPolicy", path: "auth/password-policy", methods: ["GET"] },
  { key: "verifyEmailConfirm", path: "auth/verify-email/confirm", methods: ["POST"] },
  { key: "verifyEmailResend", path: "auth/verify-email/resend", methods: ["POST"] },
  { key: "magicLinkRequest", path: "auth/magic-link/request", methods: ["POST"] },
  { key: "magicLinkVerify", path: "auth/magic-link/verify", methods: ["POST"] },
  { key: "passkeyLoginOptions", path: "auth/passkey/login/options", methods: ["POST"] },
  { key: "passkeyLoginVerify", path: "auth/passkey/login/verify", methods: ["POST"] },
  { key: "nextAuth", path: "auth/[...nextauth]", methods: ["GET", "POST"] },
  // Account — authenticated
  { key: "account", path: "account", methods: ["GET", "DELETE"] },
  { key: "accountAuthStatus", path: "account/auth-status", methods: ["GET"] },
  { key: "changePassword", path: "account/change-password", methods: ["POST"] },
  { key: "passkeysList", path: "account/passkeys", methods: ["GET"] },
  { key: "passkeyRegister", path: "account/passkeys/register", methods: ["POST"] },
  { key: "passkeyById", path: "account/passkeys/[id]", methods: ["DELETE"] },
  { key: "sessionsList", path: "account/sessions", methods: ["GET"] },
  { key: "sessionById", path: "account/sessions/[id]", methods: ["DELETE"] },
  { key: "sessionsPing", path: "account/sessions/ping", methods: ["POST"] },
  { key: "sessionsRevokeCurrent", path: "account/sessions/revoke-current", methods: ["POST"] },
  { key: "sessionsRevokeOthers", path: "account/sessions/revoke-others", methods: ["POST"] },
  { key: "sessionsRevokeAll", path: "account/sessions/revoke-all", methods: ["POST"] },
  { key: "twoFactorStatus", path: "account/2fa/status", methods: ["GET"] },
  { key: "twoFactorSetupStart", path: "account/2fa/setup/start", methods: ["POST"] },
  { key: "twoFactorSetupVerify", path: "account/2fa/setup/verify", methods: ["POST"] },
  { key: "twoFactorDisable", path: "account/2fa/disable", methods: ["POST"] },
  {
    key: "twoFactorBackupCodesRegenerate",
    path: "account/2fa/backup-codes/regenerate",
    methods: ["POST"],
  },
  // Admin panel
  { key: "adminUsers", path: "auth/admin/users", methods: ["GET"] },
  { key: "adminUserById", path: "auth/admin/users/[id]", methods: ["POST"] },
  { key: "adminLocks", path: "auth/admin/locks", methods: ["GET", "POST"] },
  { key: "adminWaitlist", path: "auth/admin/waitlist", methods: ["GET", "POST"] },
  { key: "adminInvites", path: "auth/admin/invites", methods: ["GET", "POST", "DELETE"] },
  { key: "adminApiKeys", path: "auth/admin/api-keys", methods: ["GET", "POST", "DELETE"] },
  { key: "adminConfig", path: "auth/admin/config", methods: ["GET", "POST", "DELETE"] },
  // Account profile
  { key: "accountProfile", path: "account/profile", methods: ["GET", "POST"] },
];
