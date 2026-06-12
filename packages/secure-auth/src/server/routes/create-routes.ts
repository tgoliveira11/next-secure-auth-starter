import type { SecureAuthServices } from "../../core/types.js";

export type RouteContext = { params: Promise<Record<string, string | string[]>> };

type RouteHandler = (request: Request, context?: RouteContext) => Response | Promise<Response>;

function lazyRoute(
  loader: () => Promise<Record<string, RouteHandler>>,
  method: string
): RouteHandler {
  return (request, context) =>
    loader().then((handlers) => {
      const handler = handlers[method];
      if (!handler) {
        throw new Error(`@tgoliveira/secure-auth: handler ${method} not found`);
      }
      return handler(request, context);
    });
}

function lazyLoginStart(getServices: () => Promise<SecureAuthServices>): RouteHandler {
  return (request) =>
    Promise.all([
      getServices(),
      import("./handlers/login-start.js"),
    ]).then(([services, { createLoginStartPostHandler }]) =>
      createLoginStartPostHandler(services)(request)
    );
}

/**
 * Route handler registry for Next.js App Router consumers.
 */
export function createRoutes(getServices: () => Promise<SecureAuthServices>) {
  const healthGet = async () =>
    new Response(JSON.stringify({ ok: true, package: "@tgoliveira/secure-auth", version: "0.1.0" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  return {
    health: { GET: healthGet },

    // Auth — credentials login
    loginStart: { POST: lazyLoginStart(getServices) },
    loginStartForm: { POST: lazyRoute(() => import("./handlers/auth/login-start-form.js"), "POST") },
    loginComplete: { POST: lazyRoute(() => import("./handlers/auth/login-complete.js"), "POST") },
    loginVerify2fa: { POST: lazyRoute(() => import("./handlers/auth/login-verify-2fa.js"), "POST") },
    loginVerify2faForm: {
      POST: lazyRoute(() => import("./handlers/auth/login-verify-2fa-form.js"), "POST"),
    },
    loginVerify2faOauth: {
      POST: lazyRoute(() => import("./handlers/auth/login-verify-2fa-oauth.js"), "POST"),
    },
    loginChallengeStatus: {
      GET: lazyRoute(() => import("./handlers/auth/login-challenge-status.js"), "GET"),
    },
    loginTrace: { GET: lazyRoute(() => import("./handlers/auth/login-trace.js"), "GET") },

    // Auth — registration & passwords
    register: { POST: lazyRoute(() => import("./handlers/auth/register.js"), "POST") },
    forgotPassword: { POST: lazyRoute(() => import("./handlers/auth/forgot-password.js"), "POST") },
    resetPassword: { POST: lazyRoute(() => import("./handlers/auth/reset-password.js"), "POST") },
    passwordPolicy: { GET: lazyRoute(() => import("./handlers/auth/password-policy.js"), "GET") },

    // Auth — email verification
    verifyEmailConfirm: {
      POST: lazyRoute(() => import("./handlers/auth/verify-email-confirm.js"), "POST"),
    },
    verifyEmailResend: {
      POST: lazyRoute(() => import("./handlers/auth/verify-email-resend.js"), "POST"),
    },

    // Auth — passkey login
    passkeyLoginOptions: {
      POST: lazyRoute(() => import("./handlers/auth/passkey-login-options.js"), "POST"),
    },
    passkeyLoginVerify: {
      POST: lazyRoute(() => import("./handlers/auth/passkey-login-verify.js"), "POST"),
    },

    // NextAuth
    nextAuth: {
      GET: lazyRoute(() => import("./handlers/auth/nextauth.js"), "GET"),
      POST: lazyRoute(() => import("./handlers/auth/nextauth.js"), "POST"),
    },

    // Account
    account: {
      GET: lazyRoute(() => import("./handlers/account/account.js"), "GET"),
      DELETE: lazyRoute(() => import("./handlers/account/account.js"), "DELETE"),
    },
    accountAuthStatus: {
      GET: lazyRoute(() => import("./handlers/account/auth-status.js"), "GET"),
    },
    changePassword: {
      POST: lazyRoute(() => import("./handlers/account/change-password.js"), "POST"),
    },

    // Passkeys (account)
    passkeysList: { GET: lazyRoute(() => import("./handlers/account/passkeys-list.js"), "GET") },
    passkeyRegister: {
      POST: lazyRoute(() => import("./handlers/account/passkeys-register.js"), "POST"),
    },
    passkeyById: {
      DELETE: lazyRoute(() => import("./handlers/account/passkeys-delete.js"), "DELETE"),
    },

    // Two-factor
    twoFactorStatus: {
      GET: lazyRoute(() => import("./handlers/account/two-factor-status.js"), "GET"),
    },
    twoFactorSetupStart: {
      POST: lazyRoute(() => import("./handlers/account/two-factor-setup-start.js"), "POST"),
    },
    twoFactorSetupVerify: {
      POST: lazyRoute(() => import("./handlers/account/two-factor-setup-verify.js"), "POST"),
    },
    twoFactorDisable: {
      POST: lazyRoute(() => import("./handlers/account/two-factor-disable.js"), "POST"),
    },
    twoFactorBackupCodesRegenerate: {
      POST: lazyRoute(() => import("./handlers/account/two-factor-backup-codes.js"), "POST"),
    },

    // Sessions
    sessionsList: { GET: lazyRoute(() => import("./handlers/account/sessions-list.js"), "GET") },
    sessionById: {
      DELETE: lazyRoute(() => import("./handlers/account/sessions-delete.js"), "DELETE"),
    },
    sessionsPing: { POST: lazyRoute(() => import("./handlers/account/sessions-ping.js"), "POST") },
    sessionsRevokeCurrent: {
      POST: lazyRoute(() => import("./handlers/account/sessions-revoke-current.js"), "POST"),
    },
    sessionsRevokeOthers: {
      POST: lazyRoute(() => import("./handlers/account/sessions-revoke-others.js"), "POST"),
    },
    sessionsRevokeAll: {
      POST: lazyRoute(() => import("./handlers/account/sessions-revoke-all.js"), "POST"),
    },

    // Legacy aliases (original createSecureAuth route names)
    loginCompleteLegacy: { POST: lazyRoute(() => import("./handlers/auth/login-complete.js"), "POST") },
    verifyEmail: {
      POST: lazyRoute(() => import("./handlers/auth/verify-email-confirm.js"), "POST"),
    },
    passwordResetStart: {
      POST: lazyRoute(() => import("./handlers/auth/forgot-password.js"), "POST"),
    },
    passwordResetComplete: {
      POST: lazyRoute(() => import("./handlers/auth/reset-password.js"), "POST"),
    },
    twoFactorSetup: {
      POST: lazyRoute(() => import("./handlers/account/two-factor-setup-start.js"), "POST"),
    },
    twoFactorVerify: {
      POST: lazyRoute(() => import("./handlers/account/two-factor-setup-verify.js"), "POST"),
    },
    passkeyAuthenticate: {
      POST: lazyRoute(() => import("./handlers/auth/passkey-login-verify.js"), "POST"),
    },
    sessions: {
      GET: lazyRoute(() => import("./handlers/account/sessions-list.js"), "GET"),
    },
  };
}

export type SecureAuthRoutes = ReturnType<typeof createRoutes>;
