import type { SecureAuthConfig } from "@/core/types";
import { getAppName } from "@/core/config-accessors";

export function buildMagicLinkEmail(config: SecureAuthConfig, magicLinkUrl: string) {
  const appName = getAppName(config);
  return {
    subject: `Sign in to ${appName}`,
    text: [
      `Use this link to sign in to ${appName}:`,
      magicLinkUrl,
      "",
      "This link expires in 15 minutes and can only be used once.",
      "If you did not request this email, you can ignore it.",
    ].join("\n"),
    html: `<p>Use this link to sign in to <strong>${appName}</strong>:</p><p><a href="${magicLinkUrl}">Sign in</a></p><p>This link expires in 15 minutes and can only be used once.</p><p>If you did not request this email, you can ignore it.</p>`,
  };
}

export function buildMagicLinkUrl(config: SecureAuthConfig, rawToken: string): string {
  const base = config.app.baseUrl.replace(/\/$/, "");
  const path = config.ui?.paths?.magicLinkVerify ?? "/login/magic-link";
  return `${base}${path}?token=${encodeURIComponent(rawToken)}`;
}
