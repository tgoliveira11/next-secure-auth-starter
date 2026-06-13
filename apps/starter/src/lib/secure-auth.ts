import "server-only";
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import type { EmailProvider } from "@tgoliveira/secure-auth/email";
import { db } from "@/lib/db";
import { APP_NAME, APP_SLUG } from "@/lib/brand";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";
import { readEnv } from "@/lib/env/parse";

const emailProvider: EmailProvider = {
  async send(input) {
    const { sendEmail } = await import("@/modules/email/core/send-email");
    await sendEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? "",
    });
  },
};

const envConfig = buildSecureAuthConfigFromEnv({
  appName: APP_NAME,
  appSlug: APP_SLUG,
  baseUrl: "http://localhost:3001",
});

export const secureAuth = createSecureAuth({
  db,
  ...envConfig,
  email: {
    from: readEnv(process.env, "EMAIL_FROM") ?? `${envConfig.app.name} <noreply@localhost>`,
    provider: emailProvider,
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
      loginTitle: "Sign in",
      loginDescription: "Access your account",
      registerTitle: "Create your account",
      forgotPasswordTitle: "Reset your password",
      securitySettingsTitle: "Security",
      sessionsSettingsTitle: "Sessions",
    },
  },
});
