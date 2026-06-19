import type { SecureAuthConfig, SecureAuthDb } from "@tgoliveira/secure-auth";
import {
  buildMiddlewareConfigFromUi,
  buildPublicUIConfig,
  createSecureAuthMiddleware,
} from "@tgoliveira/secure-auth/next/middleware";
import { APP_NAME, APP_SLUG } from "@/lib/brand";
import { traceAuth } from "@/lib/auth-trace";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";

function buildStarterMiddlewareConfig() {
  const slice = buildSecureAuthConfigFromEnv({
    appName: APP_NAME,
    appSlug: APP_SLUG,
    baseUrl: process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3003",
  });

  const configForUi: SecureAuthConfig = {
    ...slice,
    db: {} as SecureAuthDb,
    email: {
      from: "noreply@localhost",
      provider: { send: async () => undefined },
    },
    webauthn: {
      rpId: process.env.WEBAUTHN_RP_ID ?? "localhost",
      rpName: APP_NAME,
      origin: process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3003",
    },
    ui: {
      ...slice.ui,
      paths: {
        login: "/login",
        register: "/register",
        forgotPassword: "/forgot-password",
        resetPassword: "/reset-password",
        verifyEmail: "/verify-email",
        checkEmail: "/check-email",
        loginTwoFactor: "/login/2fa",
        loginComplete: "/login/complete",
        accountDeleted: "/account-deleted",
      },
    },
  };

  const uiConfig = buildPublicUIConfig(configForUi);
  return buildMiddlewareConfigFromUi(uiConfig, slice.auth.nextAuthSecret);
}

export const middleware = createSecureAuthMiddleware({
  ...buildStarterMiddlewareConfig(),
  onTrace: traceAuth,
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
