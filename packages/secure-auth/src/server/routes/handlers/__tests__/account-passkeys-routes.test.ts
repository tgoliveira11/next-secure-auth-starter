import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  passkeysListGet as listGet,
  passkeyRegisterPost as registerPost,
  passkeyDelete as deletePasskey,
} from "@/test/helpers/handlers";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  listPasskeys: vi.fn(),
  getRegistrationOptions: vi.fn(),
  verifyRegistration: vi.fn(),
  removePasskey: vi.fn(),
}));

vi.mock("@/modules/auth/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/lib/session")>();
  return {
    ...actual,
    requireSessionUser: mocks.requireSessionUser,
  };
});

vi.mock("@/modules/passkeys/services/passkey-account-service", () => ({
  passkeyAccountService: {
    listPasskeys: mocks.listPasskeys,
    getRegistrationOptions: mocks.getRegistrationOptions,
    verifyRegistration: mocks.verifyRegistration,
    removePasskey: mocks.removePasskey,
  },
}));

describe("account passkeys API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("lists account passkeys", async () => {
    mocks.listPasskeys.mockResolvedValue([
      {
        id: "pk-1",
        friendlyName: "Passkey",
        capabilityLabel: "Sign-in only",
      },
    ]);
    const res = await listGet();
    expect(res.status).toBe(200);
  });

  it("requires session for registration options", async () => {
    mocks.getRegistrationOptions.mockResolvedValue({ challenge: "abc" });
    const res = await registerPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "options" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.requireSessionUser).toHaveBeenCalled();
  });

  it("verifies passkey registration and rejects invalid payloads", async () => {
    mocks.verifyRegistration.mockResolvedValue({ id: "pk-2" });
    const ok = await registerPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "verify", response: { id: "cred" }, friendlyName: "Laptop" }),
      })
    );
    expect(ok.status).toBe(200);

    const missingResponse = await registerPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "verify" }),
      })
    );
    expect(missingResponse.status).toBe(400);

    const invalid = await registerPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "unknown" }),
      })
    );
    expect(invalid.status).toBe(400);
  });

  it("maps registration service failures", async () => {
    mocks.verifyRegistration.mockRejectedValue(new Error("verification failed"));
    const res = await registerPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "verify", response: { id: "cred" } }),
      })
    );
    expect(res.status).toBe(500);
  });

  it("deletes a passkey by id", async () => {
    mocks.removePasskey.mockResolvedValue({ success: true });
    const res = await deletePasskey(new Request("http://localhost"), {
      params: Promise.resolve({ id: "pk-1" }),
    });
    expect(res.status).toBe(200);
  });
});