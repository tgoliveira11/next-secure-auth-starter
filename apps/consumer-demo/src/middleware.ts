import type { SecureAuthConfig, SecureAuthDb } from "@tgoliveira/secure-auth";
import {
  buildMiddlewareConfigFromUi,
  buildPublicUIConfig,
  createSecureAuthMiddleware,
} from "@tgoliveira/secure-auth/next/middleware";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";

function buildConsumerDemoMiddlewareConfig() {
  const slice = buildSecureAuthConfigFromEnv({
    appName: "Consumer Demo",
    appSlug: "consumer-demo",
    baseUrl: process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3002",
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
      rpName: "Consumer Demo",
      origin: process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3002",
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

export const middleware = createSecureAuthMiddleware(buildConsumerDemoMiddlewareConfig());

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
