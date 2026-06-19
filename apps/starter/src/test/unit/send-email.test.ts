import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail } from "@/modules/email/core/send-email";
import * as smtpProvider from "@/modules/email/core/smtp-provider";

vi.mock("@tgoliveira/secure-auth", () => ({
  safeLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/modules/email/core/smtp-provider", () => ({
  sendSmtpEmail: vi.fn().mockResolvedValue(undefined),
  resetSmtpTransportCache: vi.fn(),
  createSmtpTransport: vi.fn(),
}));

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("EMAIL_PROVIDER", "console");
  });

  it("logs console delivery without throwing", async () => {
    await expect(
      sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hi</p>",
        text: "Hi",
      })
    ).resolves.toBeUndefined();
  });

  it("delegates to SMTP when configured", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    vi.stubEnv("EMAIL_FROM", "Starter <noreply@localhost>");
    vi.stubEnv("APP_BASE_URL", "http://localhost:3003");
    vi.stubEnv("SMTP_HOST", "localhost");
    vi.stubEnv("SMTP_PORT", "1025");
    await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
      text: "Hi",
    });
    expect(smtpProvider.sendSmtpEmail).toHaveBeenCalled();
  });

  it("logs dev links from console emails", async () => {
    const { safeLogger } = await import("@tgoliveira/secure-auth");
    await sendEmail({
      to: "user@example.com",
      subject: "Verify",
      html: "<p>Hi</p>",
      text: "Open https://app.example.com/verify-email?token=abc",
    });
    expect(safeLogger.info).toHaveBeenCalledWith(
      "Dev account email link (do not use in production logs)",
      expect.objectContaining({ url: "https://app.example.com/verify-email?token=abc" })
    );
  });

  it("rejects unsupported resend and sendgrid providers", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("EMAIL_FROM", "Starter <noreply@localhost>");
    vi.stubEnv("APP_BASE_URL", "http://localhost:3003");
    await expect(
      sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Hi</p>", text: "Hi" })
    ).rejects.toThrow(/not implemented yet/);

    vi.stubEnv("EMAIL_PROVIDER", "sendgrid");
    await expect(
      sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Hi</p>", text: "Hi" })
    ).rejects.toThrow(/not implemented yet/);
  });

  it("rejects unknown providers", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "unknown" as "console");
    await expect(
      sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Hi</p>", text: "Hi" })
    ).rejects.toThrow(/Unsupported EMAIL_PROVIDER/);
  });

  it("warns when console delivery is enabled in production", async () => {
    const { safeLogger } = await import("@tgoliveira/secure-auth");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "console");
    await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
      text: "Hi",
    });
    expect(safeLogger.warn).toHaveBeenCalledWith(
      "EMAIL_PROVIDER=console in production — emails are not delivered",
      expect.objectContaining({ subject: "Test" })
    );
  });

  it("handles console delivery without extractable links or email domains", async () => {
    const { safeLogger } = await import("@tgoliveira/secure-auth");
    await sendEmail({
      to: "not-an-email",
      subject: "Plain",
      html: "<p>Plain</p>",
      text: "Plain text only",
    });
    expect(safeLogger.info).toHaveBeenCalledWith(
      "Dev email (console adapter)",
      expect.objectContaining({ toDomain: "unknown", subject: "Plain" })
    );
  });
});
