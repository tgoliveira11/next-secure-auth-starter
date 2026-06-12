import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  assertEmailDeliveryConfig,
  buildAccountLink,
  getEmailConfig,
  getSmtpConfig,
} from "@/modules/email/core/config";

describe("email config", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("builds account links from APP_BASE_URL", () => {
    process.env.APP_BASE_URL = "https://app.example.com";
    expect(buildAccountLink("/verify-email", "abc")).toBe(
      "https://app.example.com/verify-email?token=abc"
    );
  });

  it("reads email from env with brand default", () => {
    delete process.env.EMAIL_FROM;
    const config = getEmailConfig();
    expect(config.from).toContain("Next Secure Auth Starter");
  });

  it("asserts SMTP config when delivery is smtp", () => {
    process.env.EMAIL_PROVIDER = "smtp";
    process.env.EMAIL_FROM = "Starter <noreply@localhost>";
    process.env.APP_BASE_URL = "http://localhost:3001";
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "1025";
    expect(() => assertEmailDeliveryConfig("smtp")).not.toThrow();
    expect(getSmtpConfig().host).toBe("localhost");
  });
});
