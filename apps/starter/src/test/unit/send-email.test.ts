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
});
