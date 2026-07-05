import { describe, expect, it } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import {
  passwordResetEmailContent,
  verificationEmailContent,
} from "../account-email-templates";

describe("account email templates", () => {
  it("uses package defaults with resolved ui.paths", () => {
    const config = buildTestSecureAuthConfig({
      ui: {
        paths: {
          verifyEmail: "/auth/verify",
          resetPassword: "/auth/reset",
        },
      },
    });

    const verification = verificationEmailContent(config, "opaque-token");
    expect(verification.subject).toContain("Test App");
    expect(verification.html).toContain("http://localhost:3001/auth/verify?token=opaque-token");
    expect(verification.text).toContain("http://localhost:3001/auth/verify?token=opaque-token");

    const reset = passwordResetEmailContent(config, "opaque-token");
    expect(reset.subject).toContain("Test App");
    expect(reset.html).toContain("http://localhost:3001/auth/reset?token=opaque-token");
  });

  it("delegates verification email to email.templates.verificationEmail when provided", () => {
    const config = buildTestSecureAuthConfig({
      email: {
        from: "Test <noreply@test>",
        provider: { send: async () => undefined },
        templates: {
          verificationEmail: ({ appName, verifyUrl }) => ({
            subject: `Custom verify — ${appName}`,
            html: `<a href="${verifyUrl}">Custom verify link</a>`,
            text: `Custom verify text: ${verifyUrl}`,
          }),
        },
      },
    });

    const content = verificationEmailContent(config, "custom-token");
    expect(content).toEqual({
      subject: "Custom verify — Test App",
      html: '<a href="http://localhost:3001/verify-email?token=custom-token">Custom verify link</a>',
      text: "Custom verify text: http://localhost:3001/verify-email?token=custom-token",
    });
  });

  it("delegates password reset email to email.templates.passwordReset when provided", () => {
    const config = buildTestSecureAuthConfig({
      email: {
        from: "Test <noreply@test>",
        provider: { send: async () => undefined },
        templates: {
          passwordReset: ({ appName, resetUrl }) => ({
            subject: `Custom reset — ${appName}`,
            html: `<a href="${resetUrl}">Custom reset link</a>`,
          }),
        },
      },
    });

    const content = passwordResetEmailContent(config, "custom-token");
    expect(content).toEqual({
      subject: "Custom reset — Test App",
      html: '<a href="http://localhost:3001/reset-password?token=custom-token">Custom reset link</a>',
    });
  });
});
