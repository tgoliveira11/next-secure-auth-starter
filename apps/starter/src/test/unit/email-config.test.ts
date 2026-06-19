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
    process.env.APP_BASE_URL = "http://localhost:3003";
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "1025";
    expect(() => assertEmailDeliveryConfig("smtp")).not.toThrow();
    expect(getSmtpConfig().host).toBe("localhost");
  });

  it("requires SMTP_HOST for smtp delivery", () => {
    process.env.SMTP_HOST = "";
    expect(() => getSmtpConfig()).toThrow(/SMTP_HOST is required/);
  });

  it("rejects invalid SMTP_PORT values", () => {
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "0";
    expect(() => getSmtpConfig()).toThrow(/SMTP_PORT must be a positive integer/);
  });

  it("requires credentials for remote SMTP hosts", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    expect(() => getSmtpConfig()).toThrow(/SMTP_USER and SMTP_PASSWORD are required/);
  });

  it("requires EMAIL_FROM and APP_BASE_URL for non-console providers", () => {
    delete process.env.EMAIL_FROM;
    expect(() => assertEmailDeliveryConfig("smtp")).toThrow(/EMAIL_FROM is required/);

    process.env.EMAIL_FROM = "Starter <noreply@localhost>";
    delete process.env.APP_BASE_URL;
    delete process.env.NEXTAUTH_URL;
    expect(() => assertEmailDeliveryConfig("smtp")).toThrow(/APP_BASE_URL is required/);
  });

  it("allows console delivery without SMTP credentials", () => {
    expect(() => assertEmailDeliveryConfig("console")).not.toThrow();
  });

  it("falls back to NEXTAUTH_URL for app base URL", () => {
    delete process.env.APP_BASE_URL;
    process.env.NEXTAUTH_URL = "http://localhost:3003";
    expect(getEmailConfig().appBaseUrl).toBe("http://localhost:3003");
  });

  it("defaults SMTP port when omitted", () => {
    process.env.SMTP_HOST = "127.0.0.1";
    delete process.env.SMTP_PORT;
    expect(getSmtpConfig().port).toBe(587);
  });

  it("accepts remote SMTP credentials when provided", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASSWORD = "secret";
    expect(getSmtpConfig()).toMatchObject({
      host: "smtp.example.com",
      user: "user",
      password: "secret",
    });
  });

  it("accepts NEXTAUTH_URL for non-console delivery validation", () => {
    process.env.EMAIL_FROM = "Starter <noreply@localhost>";
    delete process.env.APP_BASE_URL;
    process.env.NEXTAUTH_URL = "http://localhost:3003";
    expect(() => assertEmailDeliveryConfig("smtp")).not.toThrow();
  });
});
