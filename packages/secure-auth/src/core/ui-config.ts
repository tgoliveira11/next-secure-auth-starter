import type { PasswordPolicyConfig } from "../modules/security/password-policy/password-policy-core.js";
import {
  resolveAuthPaths,
  type AuthPaths,
} from "../modules/ui/pages/types.js";
import type { SecureAuthConfig } from "./types.js";
import {
  resolvePasswordPolicyConfig,
  resolveRevocationPollIntervalSeconds,
} from "./config-accessors.js";
import {
  buildPublicCaptchaConfig,
  type PublicCaptchaConfig,
} from "../modules/captcha/lib/captcha-config.js";
import {
  buildPublicAuthRedirectConfig,
  type PublicAuthRedirectConfig,
} from "./auth-redirect-config.js";
import {
  resolveConfiguredOAuthProviderIds,
  type OAuthProviderId,
} from "./oauth-provider-config.js";

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
  /** Public Turnstile config (site key only — never includes secret). */
  captcha?: PublicCaptchaConfig;
  /** Authenticated-user redirect behavior for guest auth pages. */
  auth: PublicAuthRedirectConfig;
  magicLink?: {
    enabled: boolean;
  };
  /** Login page layout. `twoStep` asks for email first and reveals password/passkey after. */
  login?: {
    twoStep: boolean;
  };
  preferences?: {
    enabled: boolean;
  };
  /** Configured NextAuth OAuth provider IDs. Provider credentials are never exposed. */
  oauthProviderIds?: OAuthProviderId[];
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
  loginTwoFactorOauthCompleteTitle: "Finishing two-factor sign-in",
  loginTwoFactorOauthCompleteDescription: "Completing your sign-in securely.",
  loginCompleteTitle: "Signing you in",
  loginCompleteDescription: "Finishing your sign-in securely.",
  magicLinkVerifyTitle: "Signing you in",
  magicLinkVerifyDescription: "Verifying your magic link securely.",
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
  loginContinueLabel: "Continue",
  loginChangeEmailLabel: "Use a different email",
  loginPasswordStepDescription: "Enter your password to finish signing in.",
  forgotPasswordLinkLabel: "Forgot password?",
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
    loginTwoFactorOauthComplete: uiPaths?.loginTwoFactorOauthComplete,
    loginComplete: uiPaths?.loginComplete,
    magicLinkVerify: uiPaths?.magicLinkVerify,
    afterLogin: config.auth.afterLoginPath,
    afterLogout: config.auth.afterLogoutPath,
    accountDeleted: uiPaths?.accountDeleted,
    accountSettings: uiPaths?.account ?? uiPaths?.accountSettings,
    securitySettings: uiPaths?.security ?? uiPaths?.securitySettings,
    sessionsSettings: uiPaths?.sessions ?? uiPaths?.sessionsSettings,
    waitlistPending: uiPaths?.waitlistPending,
    adminPanel: uiPaths?.adminPanel ?? config.admin?.path,
  };
}

export type { PublicAuthRedirectConfig } from "./auth-redirect-config.js";

/** Builds a JSON-serializable UI config for `SecureAuthUIProvider`. */
export function buildPublicUIConfig(config: SecureAuthConfig): SecureAuthUIPublicConfig {
  const paths = resolveAuthPaths(mapConfigPathsToAuthPaths(config));

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
    captcha: buildPublicCaptchaConfig(config),
    auth: buildPublicAuthRedirectConfig(config, paths.afterLogin),
    magicLink: {
      enabled: config.auth.magicLink?.enabled === true,
    },
    login: {
      twoStep: config.ui?.login?.twoStep === true,
    },
    preferences: {
      enabled: config.preferences?.enabled === true,
    },
    oauthProviderIds: resolveConfiguredOAuthProviderIds(config),
  };
}

export type { OAuthProviderId } from "./oauth-provider-config.js";

/**
 * Admin-overridable keys that are visible to client pages.
 *
 * The rest of the overridable keys only affect server behavior, so they never need to be
 * projected into the serializable UI config.
 */
export const UI_VISIBLE_OVERRIDE_KEYS = [
  "ui.login.twoStep",
  "passwordPolicy.minLength",
  "preferences.enabled",
] as const;

function readBooleanOverride(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Projects admin config overrides onto an already-built UI config.
 *
 * Applied on top of the serializable config instead of re-running `buildPublicUIConfig` on a
 * cloned `SecureAuthConfig`, so non-serializable fields (brand logo, db, email transport) are
 * never cloned or inspected.
 */
export function applyUIConfigOverrides(
  base: SecureAuthUIPublicConfig,
  overrides: ReadonlyMap<string, unknown>
): SecureAuthUIPublicConfig {
  if (overrides.size === 0) return base;

  let next = base;

  const twoStep = readBooleanOverride(overrides.get("ui.login.twoStep"));
  if (twoStep !== undefined) {
    next = { ...next, login: { ...next.login, twoStep } };
  }

  const minLength = overrides.get("passwordPolicy.minLength");
  if (typeof minLength === "number" && Number.isFinite(minLength)) {
    next = { ...next, passwordPolicy: { ...next.passwordPolicy, minLength } };
  }

  const preferencesEnabled = readBooleanOverride(overrides.get("preferences.enabled"));
  if (preferencesEnabled !== undefined) {
    next = { ...next, preferences: { enabled: preferencesEnabled } };
  }

  return next;
}
