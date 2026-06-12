import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeLogger } from "@tgoliveira/secure-auth";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

vi.mock("@tgoliveira/secure-auth", () => ({
  safeLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { resetSmtpTransportCache, sendSmtpEmail } from "@/modules/email/core/smtp-provider";

describe("smtp provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSmtpTransportCache();
    vi.stubEnv("SMTP_HOST", "localhost");
    vi.stubEnv("SMTP_PORT", "1025");
    vi.stubEnv("SMTP_SECURE", "false");
  });

  it("reuses cached transport across sendSmtpEmail calls", async () => {
    const payload = {
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hi</p>",
      text: "Hi",
    };
    await sendSmtpEmail("Test <test@example.com>", payload);
    await sendSmtpEmail("Test <test@example.com>", payload);
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it("sends email via nodemailer", async () => {
    await sendSmtpEmail("Test <test@example.com>", {
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hi</p>",
      text: "Hi",
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Hello",
      })
    );
    expect(safeLogger.info).toHaveBeenCalled();
  });
});
