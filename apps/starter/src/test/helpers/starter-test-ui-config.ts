import { APP_NAME, APP_SLUG } from "@/lib/brand";
import type { SecureAuthUIPublicConfig } from "@tgoliveira/secure-auth/react";

/** Mirrors `secure-auth.ts` UI defaults for unit tests without importing server-only modules. */
export const starterTestUiConfig: SecureAuthUIPublicConfig = {
  appSlug: APP_SLUG,
  appName: APP_NAME,
  paths: {
    home: "/",
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    checkEmail: "/check-email",
    verifyEmail: "/verify-email",
    loginTwoFactor: "/login/2fa",
    loginComplete: "/login/complete",
    afterLogin: "/dashboard",
    accountDeleted: "/account-deleted",
    accountSettings: "/settings/account",
    securitySettings: "/settings/security",
    sessionsSettings: "/settings/sessions",
  },
  messages: {
    loginTitle: "Sign in",
    loginDescription: "Access your account",
    registerTitle: "Create your account",
    forgotPasswordTitle: "Reset your password",
    securitySettingsTitle: "Security",
    sessionsSettingsTitle: "Sessions",
  },
  passwordPolicy: {
    enforcement: "warn",
    minLength: 12,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSymbol: false,
    blockCommonPasswords: true,
    minScore: 2,
  },
};
