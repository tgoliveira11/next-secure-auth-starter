import type { PasswordPolicyConfig } from "../modules/security/password-policy/index.js";
import {
  DEFAULT_AUTH_PATHS,
  type AuthPaths,
} from "../modules/ui/pages/types.js";
import type { SecureAuthConfig } from "./types.js";
import {
  resolvePasswordPolicyConfig,
  resolveRevocationPollIntervalSeconds,
} from "./config-accessors.js";

export type PasswordStrengthFeedbackPosition = "above" | "below";

export const DEFAULT_PASSWORD_STRENGTH_FEEDBACK_POSITION: PasswordStrengthFeedbackPosition =
  "above";

/** Poll interval for detecting revoked sessions when `singleActiveSession` is enabled. */
export const SINGLE_ACTIVE_SESSION_REVOCATION_POLL_SECONDS = 10;

/** Serializable UI configuration for client-side pages (no secrets, no ReactNode). */
export type SecureAuthUIPublicConfig = {
  appSlug: string;
  appName: string;
  paths: Required<AuthPaths>;
  messages: Record<string, string>;
  cssVariables?: Record<string, string>;
  passwordPolicy: PasswordPolicyConfig;
  passwordStrength: {
    position: PasswordStrengthFeedbackPosition;
  };
  /** When single active session is enabled, client apps should poll session and sign out revoked browsers. */
  sessionPolicy: {
    singleActiveSession: boolean;
    /** Seconds between session refetches while authenticated; `0` when policy is off. */
    revocationPollIntervalSeconds: number;
  };
};

const DEFAULT_UI_MESSAGES: Record<string, string> = {
  loginTitle: "Welcome back",
  loginDescription: "Sign in to your account.",
  registerTitle: "Create your account",
  registerDescription: "Set up secure email/password sign-in for your account.",
  forgotPasswordTitle: "Forgot your password?",
  forgotPasswordDescription:
    "Enter your email and we'll send reset instructions if an account exists.",
  resetPasswordTitle: "Choose a new password",
  checkEmailTitle: "Check your email",
  verifyEmailTitleSuccess: "Your email has been verified",
  verifyEmailTitleInvalid: "Verification link expired",
  loginTwoFactorTitle: "Two-factor authentication",
  loginTwoFactorDescription:
    "Enter the 6-digit code from your authenticator app to finish signing in.",
  loginCompleteTitle: "Signing you in",
  loginCompleteDescription: "Finishing your sign-in securely.",
  accountSettingsTitle: "Account settings",
  accountSettingsDescription:
    "Manage your email, password, verification, and account lifecycle.",
  securitySettingsTitle: "Security",
  securitySettingsDescription:
    "Manage passkeys and optional two-factor authentication for your account.",
  sessionsSettingsTitle: "Active sessions",
  sessionsSettingsDescription: "Review browsers and devices signed in to your account.",
  accountDeletedTitle: "Your account has been deleted",
  accountDeletedDescription:
    "Your account and related data have been removed from active storage.",
  dashboardTitle: "Dashboard",
  dashboardDescription:
    "You are signed in. Manage your account security settings below.",
  registerLinkLabel: "Create one",
  loginLinkLabel: "Sign in",
  returnHomeLabel: "Return home",
};

function mapConfigPathsToAuthPaths(config: SecureAuthConfig): AuthPaths {
  const uiPaths = config.ui?.paths;
  return {
    home: uiPaths?.home,
    login: uiPaths?.login,
    register: uiPaths?.register,
    forgotPassword: uiPaths?.forgotPassword,
    resetPassword: uiPaths?.resetPassword,
    checkEmail: uiPaths?.checkEmail,
    verifyEmail: uiPaths?.verifyEmail,
    loginTwoFactor: uiPaths?.loginTwoFactor,
    loginComplete: uiPaths?.loginComplete,
    afterLogin: config.auth.afterLoginPath,
    accountDeleted: uiPaths?.accountDeleted,
    accountSettings: uiPaths?.account ?? uiPaths?.accountSettings,
    securitySettings: uiPaths?.security ?? uiPaths?.securitySettings,
    sessionsSettings: uiPaths?.sessions ?? uiPaths?.sessionsSettings,
  };
}

/** Builds a JSON-serializable UI config for `SecureAuthUIProvider`. */
export function buildPublicUIConfig(config: SecureAuthConfig): SecureAuthUIPublicConfig {
  const paths = {
    ...DEFAULT_AUTH_PATHS,
    ...mapConfigPathsToAuthPaths(config),
  };

  return {
    appSlug: config.app.slug,
    appName: config.ui?.brand?.name ?? config.app.name,
    paths,
    messages: {
      ...DEFAULT_UI_MESSAGES,
      ...config.ui?.messages,
    },
    cssVariables: config.ui?.cssVariables,
    passwordPolicy: resolvePasswordPolicyConfig(config),
    passwordStrength: {
      position:
        config.ui?.passwordStrength?.position ?? DEFAULT_PASSWORD_STRENGTH_FEEDBACK_POSITION,
    },
    sessionPolicy: {
      singleActiveSession: config.sessions?.singleActiveSession === true,
      revocationPollIntervalSeconds: resolveRevocationPollIntervalSeconds(config),
    },
  };
}
