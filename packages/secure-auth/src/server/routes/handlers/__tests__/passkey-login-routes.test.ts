import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  passkeyLoginOptionsPost as optionsPost,
  passkeyLoginVerifyPost as verifyPost,
} from "@/test/helpers/handlers";
import { getTestServices } from "@/test/helpers/mock-services";
import { USER_ID } from "@/test/helpers/fixtures";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  getLoginOptions: vi.fn(),
  verifyLogin: vi.fn(),
}));

let services: SecureAuthServices;

async function buildServices() {
  return getTestServices({}, (base) => ({
    passkeyLoginService: {
      ...base.passkeyLoginService,
      getLoginOptions: mocks.getLoginOptions,
      verifyLogin: mocks.verifyLogin,
    },
  }));
}

describe("passkey login API routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    services = await buildServices();
  });

  it("returns login options", async () => {
    mocks.getLoginOptions.mockResolvedValue({
      options: { challenge: "abc" },
    });
    const res = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      services
    );
    expect(res.status).toBe(200);
  });

  it("rejects invalid login option payloads and service failures", async () => {
    const invalid = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      }),
      services
    );
    expect(invalid.status).toBe(400);

    mocks.getLoginOptions.mockRejectedValue(new Error("database unavailable"));
    const failed = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ userId: USER_ID }),
      }),
      services
    );
    expect(failed.status).toBeGreaterThanOrEqual(400);
  });

  it("returns login verify result with login token", async () => {
    mocks.verifyLogin.mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      }),
      services
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.loginToken).toBe("token");
  });

  it("rejects invalid verify payload", async () => {
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("rejects reused challenge via service error", async () => {
    const { ChallengeError } = await import("@/modules/passkeys/services/passkey-service");
    mocks.verifyLogin.mockRejectedValue(new ChallengeError("Invalid or expired challenge"));
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("sets two-factor challenge cookie when login requires TOTP", async () => {
    mocks.verifyLogin.mockResolvedValue({
      requiresTwoFactor: true,
      challengeToken: "challenge-token-1234567890",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      }),
      services
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.requiresTwoFactor).toBe(true);
    expect(res.cookies.get(services.ctx.getTwoFactorLoginChallengeCookieName())?.value).toBe(
      "challenge-token-1234567890"
    );
  });

  it("does not return private-letter sentinel content", async () => {
    mocks.verifyLogin.mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      }),
      services
    );
    const text = await res.text();
    expect(text).not.toContain("SENTINEL-PRIVATE-LETTER");
    expect(text).toContain("loginToken");
  });
});
