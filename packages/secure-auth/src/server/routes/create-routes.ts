import type { SecureAuthServices } from "../../core/types.js";
import { SECURE_AUTH_PACKAGE_VERSION } from "../../core/package-version.js";

export type RouteContext = { params: Promise<Record<string, string | string[]>> };

type RouteHandler = (request: Request, context?: RouteContext) => Response | Promise<Response>;

type HandlerFactories = {
  createGetHandler?: (services: SecureAuthServices) => RouteHandler;
  createPostHandler?: (services: SecureAuthServices) => RouteHandler;
  createDeleteHandler?: (services: SecureAuthServices) => RouteHandler;
};

function lazyServiceRoute(
  getServices: () => Promise<SecureAuthServices>,
  loader: () => Promise<HandlerFactories>,
  method: "GET" | "POST" | "DELETE"
): RouteHandler {
  const factoryKey =
    method === "GET"
      ? "createGetHandler"
      : method === "POST"
        ? "createPostHandler"
        : "createDeleteHandler";

  return (request, context) =>
    Promise.all([getServices(), loader()]).then(([services, mod]) => {
      const factory = mod[factoryKey];
      if (!factory) {
        throw new Error(`@tgoliveira/secure-auth: handler ${factoryKey} not found`);
      }
      return factory(services)(request, context);
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

function lazyNextAuth(getServices: () => Promise<SecureAuthServices>): {
  GET: RouteHandler;
  POST: RouteHandler;
} {
  const loader = async () => {
    const { default: NextAuth } = await import("next-auth");
    const { createNextAuthRouteHandlers } = await import(
      "./handlers/auth/create-nextauth-route-handlers.js"
    );
    return createNextAuthRouteHandlers(NextAuth, getServices);
  };

  return {
    GET: (request, context) => loader().then(({ GET }) => GET(request, context)),
    POST: (request, context) => loader().then(({ POST }) => POST(request, context)),
  };
}

/**
 * Route handler registry for Next.js App Router consumers.
 */
export function createRoutes(getServices: () => Promise<SecureAuthServices>) {
  const healthGet = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        package: "@tgoliveira/secure-auth",
        version: SECURE_AUTH_PACKAGE_VERSION,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );

  const route = (
    loader: () => Promise<HandlerFactories>,
    method: "GET" | "POST" | "DELETE"
  ) => ({ [method]: lazyServiceRoute(getServices, loader, method) });

  return {
    health: { GET: healthGet },

    loginStart: { POST: lazyLoginStart(getServices) },
    loginStartForm: route(() => import("./handlers/auth/login-start-form.js"), "POST"),
    loginComplete: route(() => import("./handlers/auth/login-complete.js"), "POST"),
    loginVerify2fa: route(() => import("./handlers/auth/login-verify-2fa.js"), "POST"),
    loginVerify2faForm: route(() => import("./handlers/auth/login-verify-2fa-form.js"), "POST"),
    loginVerify2faOauth: route(() => import("./handlers/auth/login-verify-2fa-oauth.js"), "POST"),
    loginChallengeStatus: route(() => import("./handlers/auth/login-challenge-status.js"), "GET"),
    loginTrace: route(() => import("./handlers/auth/login-trace.js"), "GET"),

    register: route(() => import("./handlers/auth/register.js"), "POST"),
    forgotPassword: route(() => import("./handlers/auth/forgot-password.js"), "POST"),
    resetPassword: route(() => import("./handlers/auth/reset-password.js"), "POST"),
    passwordPolicy: route(() => import("./handlers/auth/password-policy.js"), "GET"),

    verifyEmailConfirm: route(() => import("./handlers/auth/verify-email-confirm.js"), "POST"),
    verifyEmailResend: route(() => import("./handlers/auth/verify-email-resend.js"), "POST"),

    magicLinkRequest: route(() => import("./handlers/auth/magic-link-request.js"), "POST"),
    magicLinkVerify: {
      POST: lazyServiceRoute(
        getServices,
        () => import("./handlers/auth/magic-link-verify.js"),
        "POST"
      ),
    },

    passkeyLoginOptions: route(() => import("./handlers/auth/passkey-login-options.js"), "POST"),
    passkeyLoginVerify: route(() => import("./handlers/auth/passkey-login-verify.js"), "POST"),

    nextAuth: lazyNextAuth(getServices),

    account: {
      GET: lazyServiceRoute(getServices, () => import("./handlers/account/account.js"), "GET"),
      DELETE: lazyServiceRoute(
        getServices,
        () => import("./handlers/account/account.js"),
        "DELETE"
      ),
    },
    accountAuthStatus: route(() => import("./handlers/account/auth-status.js"), "GET"),
    changePassword: route(() => import("./handlers/account/change-password.js"), "POST"),

    passkeysList: route(() => import("./handlers/account/passkeys-list.js"), "GET"),
    passkeyRegister: route(() => import("./handlers/account/passkeys-register.js"), "POST"),
    passkeyById: route(() => import("./handlers/account/passkeys-delete.js"), "DELETE"),

    twoFactorStatus: route(() => import("./handlers/account/two-factor-status.js"), "GET"),
    twoFactorSetupStart: route(() => import("./handlers/account/two-factor-setup-start.js"), "POST"),
    twoFactorSetupVerify: route(() => import("./handlers/account/two-factor-setup-verify.js"), "POST"),
    twoFactorDisable: route(() => import("./handlers/account/two-factor-disable.js"), "POST"),
    twoFactorBackupCodesRegenerate: route(
      () => import("./handlers/account/two-factor-backup-codes.js"),
      "POST"
    ),

    sessionsList: route(() => import("./handlers/account/sessions-list.js"), "GET"),
    sessionById: route(() => import("./handlers/account/sessions-delete.js"), "DELETE"),
    sessionsPing: route(() => import("./handlers/account/sessions-ping.js"), "POST"),
    sessionsRevokeCurrent: route(
      () => import("./handlers/account/sessions-revoke-current.js"),
      "POST"
    ),
    sessionsRevokeOthers: route(
      () => import("./handlers/account/sessions-revoke-others.js"),
      "POST"
    ),
    sessionsRevokeAll: route(() => import("./handlers/account/sessions-revoke-all.js"), "POST"),

    // Admin panel routes (only active when admin.enabled = true)
    adminUsers: route(() => import("./handlers/admin/admin-users.js"), "GET"),
    adminUserById: {
      POST: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-users.js"), "POST"),
    },
    adminLocks: {
      GET: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-locks.js"), "GET"),
      POST: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-locks.js"), "POST"),
    },
    adminWaitlist: {
      GET: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-waitlist.js"), "GET"),
      POST: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-waitlist.js"), "POST"),
    },
    adminInvites: {
      GET: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-invites.js"), "GET"),
      POST: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-invites.js"), "POST"),
      DELETE: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-invites.js"), "DELETE"),
    },
    adminApiKeys: {
      GET: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-api-keys.js"), "GET"),
      POST: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-api-keys.js"), "POST"),
      DELETE: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-api-keys.js"), "DELETE"),
    },
    adminConfig: {
      GET: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-config.js"), "GET"),
      POST: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-config.js"), "POST"),
      DELETE: lazyServiceRoute(getServices, () => import("./handlers/admin/admin-config.js"), "DELETE"),
    },

    // Account profile
    accountProfile: {
      GET: lazyServiceRoute(getServices, () => import("./handlers/account/profile.js"), "GET"),
      POST: lazyServiceRoute(getServices, () => import("./handlers/account/profile.js"), "POST"),
    },
  };
}

export type SecureAuthRoutes = ReturnType<typeof createRoutes>;
