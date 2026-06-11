import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as optionsPost } from "@/app/api/auth/passkey/login/options/route";
import { POST as verifyPost } from "@/app/api/auth/passkey/login/verify/route";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  getLoginOptions: vi.fn(),
  verifyLogin: vi.fn(),
}));

vi.mock("@/server/services/passkey-login-service", () => ({
  passkeyLoginService: {
    getLoginOptions: mocks.getLoginOptions,
    verifyLogin: mocks.verifyLogin,
  },
}));

describe("passkey login API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns login options", async () => {
    mocks.getLoginOptions.mockResolvedValue({
      options: { challenge: "abc" },
    });
    const res = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(200);
  });

  it("rejects invalid login option payloads and service failures", async () => {
    const invalid = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      })
    );
    expect(invalid.status).toBe(400);

    mocks.getLoginOptions.mockRejectedValue(new Error("database unavailable"));
    const failed = await optionsPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ userId: USER_ID }),
      })
    );
    expect(failed.status).toBeGreaterThanOrEqual(400);
  });

  it("returns login verify result with login token", async () => {
    mocks.verifyLogin.mockResolvedValue({
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      })
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
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects reused challenge via service error", async () => {
    const { ChallengeError } = await import("@/server/services/passkey-service");
    mocks.verifyLogin.mockRejectedValue(new ChallengeError("Invalid or expired challenge"));
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("does not return private-letter sentinel content", async () => {
    mocks.verifyLogin.mockResolvedValue({
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    const res = await verifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ response: { id: "cred" } }),
      })
    );
    const text = await res.text();
    expect(text).not.toContain("SENTINEL-PRIVATE-LETTER");
    expect(text).toContain("loginToken");
  });
});
