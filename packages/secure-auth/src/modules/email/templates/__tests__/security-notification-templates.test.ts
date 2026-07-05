import { describe, it, expect } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import {
  buildAccountEmailChangedNotificationEmail,
  buildMagicLinkUsedNotificationEmail,
  buildNewLoginNotificationEmail,
  buildPasswordChangedNotificationEmail,
  buildTwoFactorDisabledNotificationEmail,
  getAppNameFromConfig,
  newLoginNotificationEmailContent,
  passwordChangedNotificationEmailContent,
} from "../security-notification-templates";

const occurredAt = new Date("2026-01-15T12:00:00.000Z");

describe("security notification templates", () => {
  it("builds new login email with known device metadata", () => {
    const email = buildNewLoginNotificationEmail("Test App", {
      browser: "Chrome",
      platform: "macOS",
      deviceType: "desktop",
      ipMasked: "1.2.*.*",
      occurredAt,
    });

    expect(email.subject).toContain("Test App");
    expect(email.text).toContain("Chrome · macOS · desktop · IP 1.2.*.*");
    expect(email.html).toContain("Chrome · macOS · desktop · IP 1.2.*.*");
  });

  it("falls back to unknown device when metadata is missing or unknown", () => {
    const email = buildNewLoginNotificationEmail("Test App", {
      browser: "unknown",
      platform: "unknown",
      occurredAt,
    });

    expect(email.text).toContain("Device: Unknown device");
  });

  it("builds password changed and two-factor disabled emails", () => {
    const password = buildPasswordChangedNotificationEmail("Test App", occurredAt);
    const twoFactor = buildTwoFactorDisabledNotificationEmail("Test App", occurredAt);

    expect(password.subject).toContain("password was changed");
    expect(twoFactor.text).toContain("re-enable it immediately");
  });

  it("builds account email changed notification", () => {
    const email = buildAccountEmailChangedNotificationEmail("Test App", {
      previousEmail: "old@example.com",
      newEmail: "new@example.com",
      occurredAt,
    });

    expect(email.text).toContain("old@example.com");
    expect(email.text).toContain("new@example.com");
  });

  it("builds magic link used notification", () => {
    const email = buildMagicLinkUsedNotificationEmail("Test App", {
      ipMasked: "10.0.*.*",
      occurredAt,
    });

    expect(email.subject).toContain("Magic link sign-in");
    expect(email.text).toContain("IP 10.0.*.*");
  });

  it("prefers ui brand name in getAppNameFromConfig", () => {
    expect(
      getAppNameFromConfig({
        app: { name: "Config Name" },
        ui: { brand: { name: "Brand Name" } },
      })
    ).toBe("Brand Name");

    expect(getAppNameFromConfig({ app: { name: "Config Name" } })).toBe("Config Name");
  });

  it("delegates security notification emails to email.templates overrides", () => {
    const config = buildTestSecureAuthConfig({
      email: {
        from: "Test <noreply@test>",
        provider: { send: async () => undefined },
        templates: {
          newLoginNotification: ({ appName }) => ({
            subject: `Custom login — ${appName}`,
            html: "<p>Custom login</p>",
          }),
          passwordChangedNotification: ({ appName }) => ({
            subject: `Custom password — ${appName}`,
            html: "<p>Custom password</p>",
          }),
        },
      },
    });

    expect(
      newLoginNotificationEmailContent(config, {
        browser: "Chrome",
        occurredAt,
      })
    ).toEqual({
      subject: "Custom login — Test App",
      html: "<p>Custom login</p>",
    });

    expect(passwordChangedNotificationEmailContent(config, occurredAt)).toEqual({
      subject: "Custom password — Test App",
      html: "<p>Custom password</p>",
    });
  });
});
