import { getAppName } from "@/core/config-accessors";

function supportFooter(appName: string): string {
  return `If this wasn't you, contact ${appName} support immediately.`;
}

function formatWhen(date: Date): string {
  return date.toUTCString();
}

function deviceLine(input: { browser?: string; platform?: string; deviceType?: string; ipMasked?: string }) {
  const parts = [
    input.browser && input.browser !== "unknown" ? input.browser : null,
    input.platform && input.platform !== "unknown" ? input.platform : null,
    input.deviceType && input.deviceType !== "unknown" ? input.deviceType : null,
    input.ipMasked ? `IP ${input.ipMasked}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Unknown device";
}

export function buildNewLoginNotificationEmail(
  appName: string,
  input: { browser?: string; platform?: string; deviceType?: string; ipMasked?: string; occurredAt: Date }
) {
  const when = formatWhen(input.occurredAt);
  const device = deviceLine(input);
  return {
    subject: `New sign-in to ${appName}`,
    text: [
      `A new sign-in to your ${appName} account was detected.`,
      "",
      `Device: ${device}`,
      `Time: ${when}`,
      "",
      supportFooter(appName),
    ].join("\n"),
    html: `<p>A new sign-in to your <strong>${appName}</strong> account was detected.</p><p><strong>Device:</strong> ${device}<br/><strong>Time:</strong> ${when}</p><p>${supportFooter(appName)}</p>`,
  };
}

export function buildPasswordChangedNotificationEmail(appName: string, occurredAt: Date) {
  const when = formatWhen(occurredAt);
  return {
    subject: `Your ${appName} password was changed`,
    text: [
      `Your ${appName} account password was changed.`,
      "",
      `Time: ${when}`,
      "",
      supportFooter(appName),
    ].join("\n"),
    html: `<p>Your <strong>${appName}</strong> account password was changed.</p><p><strong>Time:</strong> ${when}</p><p>${supportFooter(appName)}</p>`,
  };
}

export function buildTwoFactorDisabledNotificationEmail(appName: string, occurredAt: Date) {
  const when = formatWhen(occurredAt);
  return {
    subject: `Two-factor authentication disabled on ${appName}`,
    text: [
      `Two-factor authentication was disabled on your ${appName} account.`,
      "",
      `Time: ${when}`,
      "",
      "If you did not disable two-factor authentication, re-enable it immediately.",
      supportFooter(appName),
    ].join("\n"),
    html: `<p>Two-factor authentication was disabled on your <strong>${appName}</strong> account.</p><p><strong>Time:</strong> ${when}</p><p>If you did not disable two-factor authentication, re-enable it immediately.</p><p>${supportFooter(appName)}</p>`,
  };
}

export function buildAccountEmailChangedNotificationEmail(
  appName: string,
  input: { previousEmail: string; newEmail: string; occurredAt: Date }
) {
  const when = formatWhen(input.occurredAt);
  return {
    subject: `Your ${appName} email address was changed`,
    text: [
      `The email address on your ${appName} account was changed.`,
      "",
      `Previous email: ${input.previousEmail}`,
      `New email: ${input.newEmail}`,
      `Time: ${when}`,
      "",
      supportFooter(appName),
    ].join("\n"),
    html: `<p>The email address on your <strong>${appName}</strong> account was changed.</p><p><strong>Previous email:</strong> ${input.previousEmail}<br/><strong>New email:</strong> ${input.newEmail}<br/><strong>Time:</strong> ${when}</p><p>${supportFooter(appName)}</p>`,
  };
}

export function buildMagicLinkUsedNotificationEmail(
  appName: string,
  input: { browser?: string; platform?: string; deviceType?: string; ipMasked?: string; occurredAt: Date }
) {
  const when = formatWhen(input.occurredAt);
  const device = deviceLine(input);
  return {
    subject: `Magic link sign-in to ${appName}`,
    text: [
      `Your ${appName} account was signed in using a magic link.`,
      "",
      `Device: ${device}`,
      `Time: ${when}`,
      "",
      supportFooter(appName),
    ].join("\n"),
    html: `<p>Your <strong>${appName}</strong> account was signed in using a magic link.</p><p><strong>Device:</strong> ${device}<br/><strong>Time:</strong> ${when}</p><p>${supportFooter(appName)}</p>`,
  };
}

export function getAppNameFromConfig(config: { app: { name: string }; ui?: { brand?: { name?: string } } }) {
  return config.ui?.brand?.name ?? getAppName(config as never);
}
