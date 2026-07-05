import { getAppName } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";
import { ACCOUNT_PASSWORD_RESET_NOTE } from "@/modules/account/lib/account-auth-messages";
import { resolveAuthPaths } from "@/modules/ui/pages/types.js";
import { resolveEmailTemplate } from "./resolve-email-template.js";

function buildAccountLink(config: SecureAuthConfig, path: string, token: string): string {
  const base = config.app.baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}?token=${encodeURIComponent(token)}`;
}

function defaultVerificationEmailContent(appName: string, verifyUrl: string) {
  return {
    subject: `Verify your email — ${appName}`,
    text: [
      "Please verify your email address to finish setting up your account.",
      "",
      verifyUrl,
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: [
      "<p>Please verify your email address to finish setting up your account.</p>",
      `<p><a href="${verifyUrl}">Verify your email</a></p>`,
      "<p>If you did not create this account, you can ignore this email.</p>",
    ].join(""),
  };
}

function defaultPasswordResetEmailContent(appName: string, resetUrl: string) {
  return {
    subject: `Reset your password — ${appName}`,
    text: [
      "We received a request to reset your account password.",
      "",
      resetUrl,
      "",
      ACCOUNT_PASSWORD_RESET_NOTE,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: [
      "<p>We received a request to reset your account password.</p>",
      `<p><a href="${resetUrl}">Reset your password</a></p>`,
      `<p>${ACCOUNT_PASSWORD_RESET_NOTE}</p>`,
      "<p>If you did not request this, you can ignore this email.</p>",
    ].join(""),
  };
}

export function verificationEmailContent(config: SecureAuthConfig, token: string) {
  const paths = resolveAuthPaths(config.ui?.paths);
  const appName = getAppName(config);
  const verifyUrl = buildAccountLink(config, paths.verifyEmail, token);
  return resolveEmailTemplate(
    config.email.templates?.verificationEmail,
    { appName, verifyUrl },
    () => defaultVerificationEmailContent(appName, verifyUrl)
  );
}

export function passwordResetEmailContent(config: SecureAuthConfig, token: string) {
  const paths = resolveAuthPaths(config.ui?.paths);
  const appName = getAppName(config);
  const resetUrl = buildAccountLink(config, paths.resetPassword, token);
  return resolveEmailTemplate(
    config.email.templates?.passwordReset,
    { appName, resetUrl },
    () => defaultPasswordResetEmailContent(appName, resetUrl)
  );
}
