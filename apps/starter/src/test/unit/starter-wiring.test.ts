import { describe, it, expect, vi, beforeEach } from "vitest";
import { APP_SLUG } from "@/lib/brand";
import { traceAuth } from "@/lib/auth-trace";
import { PASSKEY_LOGIN_OUTCOME_KEY } from "@/features/passkey/sign-in-with-passkey";
import { TWO_FACTOR_LOGIN_CHALLENGE_COOKIE } from "@/lib/two-factor-cookies";
import { buildPasskeyLoginOutcomeKey } from "@tgoliveira/secure-auth/react/client";
import { buildTwoFactorLoginChallengeCookieName } from "@tgoliveira/secure-auth/client";
import * as emailModule from "@/modules/email";

const sendEmailMock = vi.fn();

vi.mock("@/modules/email/core/send-email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

describe("starter wiring helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("exports passkey outcome key for the starter app slug", () => {
    expect(PASSKEY_LOGIN_OUTCOME_KEY).toBe(buildPasskeyLoginOutcomeKey(APP_SLUG));
  });

  it("exports two-factor challenge cookie name for the starter app slug", () => {
    expect(TWO_FACTOR_LOGIN_CHALLENGE_COOKIE).toBe(
      buildTwoFactorLoginChallengeCookieName(APP_SLUG)
    );
  });

  it("logs auth trace steps when debug tracing is enabled", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("AUTH_DEBUG_TRACE", "true");
    traceAuth("middleware:guest-redirect", { path: "/login" });
    expect(info).toHaveBeenCalledWith("auth-trace", {
      step: "middleware:guest-redirect",
      path: "/login",
    });
    info.mockRestore();
  });

  it("re-exports email module helpers", () => {
    expect(emailModule.sendEmail).toBeTypeOf("function");
    expect(emailModule.getEmailConfig).toBeTypeOf("function");
    expect(emailModule.sendSmtpEmail).toBeTypeOf("function");
  });

  it("secure-auth email provider delegates to starter sendEmail", async () => {
    sendEmailMock.mockResolvedValue(undefined);
    const { secureAuth } = await import("@/lib/secure-auth");
    await secureAuth.config.email.provider.send({
      to: "user@example.com",
      subject: "Verify",
      html: "<p>Verify</p>",
      text: "Verify",
    });
    expect(sendEmailMock).toHaveBeenCalledWith({
      to: "user@example.com",
      subject: "Verify",
      html: "<p>Verify</p>",
      text: "Verify",
    });
  });

  it("secure-auth email provider defaults missing text to an empty string", async () => {
    sendEmailMock.mockResolvedValue(undefined);
    const { secureAuth } = await import("@/lib/secure-auth");
    await secureAuth.config.email.provider.send({
      to: "user@example.com",
      subject: "Verify",
      html: "<p>Verify</p>",
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "",
      })
    );
  });
});
