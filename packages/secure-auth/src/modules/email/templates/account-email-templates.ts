import { ACCOUNT_PASSWORD_RESET_NOTE } from "@/modules/account/lib/account-auth-messages";
import { getSecureAuthConfig } from "@/core/secure-auth-runtime";

function buildAccountLink(path: string, token: string): string {
  const { app } = getSecureAuthConfig();
  const base = app.baseUrl.replace(/\/$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

export function verificationEmailContent(token: string) {
  const appName = getSecureAuthConfig().app.name;
  const link = buildAccountLink("/verify-email", token);
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

export function passwordResetEmailContent(token: string) {
  const appName = getSecureAuthConfig().app.name;
  const link = buildAccountLink("/reset-password", token);
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