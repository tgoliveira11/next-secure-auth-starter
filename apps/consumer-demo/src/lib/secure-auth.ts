import "server-only";
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import { db } from "@/lib/db";
import { consoleEmailProvider } from "@/lib/email-provider";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";
import { readEnv } from "@/lib/env/parse";

const envConfig = buildSecureAuthConfigFromEnv({
  appName: "Consumer Demo",
  appSlug: "consumer-demo",
  baseUrl: "http://localhost:3002",
});

export const secureAuth = createSecureAuth({
  db,
  ...envConfig,
  email: {
    from: readEnv(process.env, "EMAIL_FROM") ?? `${envConfig.app.name} <noreply@localhost>`,
    provider: consoleEmailProvider,
  },
  ui: {
    ...envConfig.ui,
    paths: {
      login: "/login",
      register: "/register",
      forgotPassword: "/forgot-password",
      resetPassword: "/reset-password",
      verifyEmail: "/verify-email",
      checkEmail: "/check-email",
      loginTwoFactor: "/login/2fa",
      loginComplete: "/login/complete",
      account: "/settings/account",
      security: "/settings/security",
      sessions: "/settings/sessions",
      accountDeleted: "/account-deleted",
    },
    messages: {
      loginTitle: "Sign in to Consumer Demo",
      registerTitle: "Create your Consumer Demo account",
      securitySettingsTitle: "Consumer Demo security",
      sessionsSettingsTitle: "Active Consumer Demo sessions",
      dashboardTitle: "Consumer Demo dashboard",
    },
  },
});
