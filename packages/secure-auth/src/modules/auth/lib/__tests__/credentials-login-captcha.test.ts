import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCredentialsLoginFormPost } from "@/modules/auth/lib/credentials-login-start-handler";
import { getTestServices } from "@/test/helpers/mock-services";
import { CaptchaVerificationError } from "@/modules/captcha/errors";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  startCredentialsLogin: vi.fn(),
  verifyCaptcha: vi.fn(),
}));

vi.mock("@/modules/captcha/services/turnstile-verifier", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/captcha/services/turnstile-verifier")>();
  return {
    ...actual,
    verifyCaptcha: mocks.verifyCaptcha,
  };
});

let services: SecureAuthServices;

const captchaOverrides = {
  captcha: {
    enabled: true,
    provider: "turnstile" as const,
    siteKey: "site-key",
    secretKey: "secret-key",
    pages: { register: false, login: true },
  },
};

function formRequest(fields: Record<string, string>) {
  return new Request("http://localhost/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
}

describe("credentials login captcha", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.verifyCaptcha.mockResolvedValue(undefined);
    mocks.startCredentialsLogin.mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "login-token-1234567890",
    });
    services = await getTestServices(captchaOverrides, (base) => ({
      authLoginService: {
        ...base.authLoginService,
        startCredentialsLogin: mocks.startCredentialsLogin,
      },
    }));
  });

  it("rejects login when captcha verification fails", async () => {
    mocks.verifyCaptcha.mockRejectedValueOnce(new CaptchaVerificationError());

    const response = await handleCredentialsLoginFormPost(
      formRequest({
        email: "user@example.com",
        password: "password12345",
      }),
      services
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("error=captcha_failed");
    expect(mocks.startCredentialsLogin).not.toHaveBeenCalled();
  });

  it("continues login when captcha verification passes", async () => {
    const response = await handleCredentialsLoginFormPost(
      formRequest({
        email: "user@example.com",
        password: "password12345",
        captchaToken: "valid-token",
      }),
      services
    );

    expect(response.status).toBe(303);
    expect(mocks.verifyCaptcha).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login", token: "valid-token" })
    );
    expect(mocks.startCredentialsLogin).toHaveBeenCalled();
  });
});
