import { getAppName } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";
import { ACCOUNT_PASSWORD_RESET_NOTE } from "@/modules/account/lib/account-auth-messages";

function buildAccountLink(config: SecureAuthConfig, path: string, token: string): string {
  const base = config.app.baseUrl.replace(/\/$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

export function verificationEmailContent(config: SecureAuthConfig, token: string) {
  const appName = getAppName(config);
  const link = buildAccountLink(config, "/verify-email", token);
  return {
    subject: `Verify your email — ${appName}`,
    text: [
      "Please verify your email address to finish setting up your account.",
      "",
      link,
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: [
      "<p>Please verify your email address to finish setting up your account.</p>",
      `<p><a href="${link}">Verify your email</a></p>`,
      "<p>If you did not create this account, you can ignore this email.</p>",
    ].join(""),
  };
}

export function passwordResetEmailContent(config: SecureAuthConfig, token: string) {
  const appName = getAppName(config);
  const link = buildAccountLink(config, "/reset-password", token);
  return {
    subject: `Reset your password — ${appName}`,
    text: [
      "We received a request to reset your account password.",
      "",
      link,
      "",
      ACCOUNT_PASSWORD_RESET_NOTE,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: [
      "<p>We received a request to reset your account password.</p>",
      `<p><a href="${link}">Reset your password</a></p>`,
      `<p>${ACCOUNT_PASSWORD_RESET_NOTE}</p>`,
      "<p>If you did not request this, you can ignore this email.</p>",
    ].join(""),
  };
}
