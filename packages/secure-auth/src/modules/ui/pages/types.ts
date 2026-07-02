import type { ReactNode } from "react";
import type { PasswordStrengthFeedbackPosition } from "../../../core/ui-config.js";
import type { PasswordPolicyConfig } from "../../security/password-policy/password-policy-core.js";

export type { PasswordStrengthFeedbackPosition };

export type PageWidth = "narrow" | "medium" | "wide";

/** Default route paths for auth and account flows. Override per page or via `paths`. */
export type AuthPaths = {
  home?: string;
  login?: string;
  register?: string;
  forgotPassword?: string;
  resetPassword?: string;
  checkEmail?: string;
  verifyEmail?: string;
  loginTwoFactor?: string;
  loginTwoFactorOauthComplete?: string;
  loginComplete?: string;
  magicLinkVerify?: string;
  afterLogin?: string;
  accountDeleted?: string;
  accountSettings?: string;
  securitySettings?: string;
  sessionsSettings?: string;
  waitlistPending?: string;
  adminPanel?: string;
};

export const DEFAULT_AUTH_PATHS: Required<AuthPaths> = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  checkEmail: "/check-email",
  verifyEmail: "/verify-email",
  loginTwoFactor: "/login/2fa",
  loginTwoFactorOauthComplete: "/login/2fa/complete",
  loginComplete: "/login/complete",
  magicLinkVerify: "/login/magic-link",
  afterLogin: "/dashboard",
  accountDeleted: "/account-deleted",
  accountSettings: "/settings/account",
  securitySettings: "/settings/security",
  sessionsSettings: "/settings/sessions",
  waitlistPending: "/waitlist",
  adminPanel: "/admin",
};

export function resolveAuthPaths(overrides?: AuthPaths): Required<AuthPaths> {
  return { ...DEFAULT_AUTH_PATHS, ...overrides };
}

/** Shared customization props for ready-to-use pages. */
export type BasePageProps = {
  className?: string;
  width?: PageWidth;
  /** Primary heading (maps to PageHeader title). */
  title?: string;
  /** Secondary heading line when distinct from description. */
  subtitle?: string;
  /** PageHeader description / lead text. */
  description?: string;
  /** Optional brand mark or logo rendered above the title. */
  brand?: ReactNode;
  /** App or product name for contextual copy. */
  appName?: string;
  /** Extra content below the main card (e.g. secondary links). */
  footer?: ReactNode;
  /** Slot rendered above page content inside the shell. */
  header?: ReactNode;
  /** Override default route paths for links and redirects. */
  paths?: AuthPaths;
  /** When false, fully authenticated users can view guest auth pages. Default: true (from config). */
  redirectIfAuthenticated?: boolean;
  /** Redirect target for fully authenticated users on guest auth pages. */
  authenticatedRedirectPath?: string;
  /** Override global password strength/validation feedback placement for this page. */
  passwordStrengthPosition?: PasswordStrengthFeedbackPosition;
};

export type SecureAuthPageProps = BasePageProps & {
  /** Application slug for passkey hints and 2FA storage keys. Required for passkey/2FA settings. */
  appSlug?: string;
  /** Called after account deletion or when a session revoke requires sign-out. */
  onSignOut?: () => Promise<void>;
};

export type LoginPageProps = SecureAuthPageProps & {
  registerLinkLabel?: string;
  forgotPasswordLinkLabel?: string;
  submitLabel?: string;
  /** OAuth / passkey callback after successful sign-in. */
  afterLoginPath?: string;
};

export type RegisterPageProps = SecureAuthPageProps & {
  submitLabel?: string;
  loginLinkLabel?: string;
  passwordPolicy?: Partial<PasswordPolicyConfig>;
  afterLoginPath?: string;
};

export type ForgotPasswordPageProps = SecureAuthPageProps & {
  submitLabel?: string;
  successMessage?: string;
};

export type ResetPasswordPageProps = SecureAuthPageProps & {
  submitLabel?: string;
  /** Token from query string; when omitted the page reads `?token=` via useSearchParams. */
  token?: string;
};

export type CheckEmailPageProps = SecureAuthPageProps & {
  email?: string;
  verificationRequired?: boolean;
};

export type VerifyEmailPageProps = SecureAuthPageProps & {
  token?: string;
};

export type LoginTwoFactorPageProps = SecureAuthPageProps & {
  mode?: "credentials" | "oauth";
  errorCode?: string;
  afterLoginPath?: string;
};

export type LoginCompletePageProps = SecureAuthPageProps & {
  afterLoginPath?: string;
  errorMessage?: string;
};

export type LoginTwoFactorOauthCompletePageProps = SecureAuthPageProps & {
  afterLoginPath?: string;
  errorMessage?: string;
};

export type MagicLinkVerifyPageProps = SecureAuthPageProps & {
  afterLoginPath?: string;
  errorMessage?: string;
  /** Token from query string; when omitted the page reads `?token=` via useSearchParams. */
  token?: string;
};

export type AccountSettingsPageProps = SecureAuthPageProps & {
  afterDeletePath?: string;
  deleteSubmitLabel?: string;
};

export type SecuritySettingsPageProps = SecureAuthPageProps & {
  userId?: string;
};

export type SessionsSettingsPageProps = SecureAuthPageProps;

export type AccountDeletedPageProps = BasePageProps & {
  homePath?: string;
  returnHomeLabel?: string;
};

export type DashboardPlaceholderPageProps = SecureAuthPageProps;
