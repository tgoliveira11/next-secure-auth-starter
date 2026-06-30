import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestServices } from "@/test/helpers/mock-services";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  requireVerifiedMutatingAccountUser: vi.fn(),
  removePasskey: vi.fn(),
}));

vi.mock("@/modules/auth/lib/route-auth", () => ({
  requireVerifiedMutatingAccountUser: mocks.requireVerifiedMutatingAccountUser,
}));

let services: SecureAuthServices;

describe("passkeys delete route", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireVerifiedMutatingAccountUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    mocks.removePasskey.mockResolvedValue({ success: true });
    services = await getTestServices({}, (base) => ({
      passkeyAccountService: {
        ...base.passkeyAccountService,
        removePasskey: mocks.removePasskey,
      },
    }));
  });

  it("returns 400 without route context", async () => {
    const { createDeleteHandler } = await import("../account/passkeys-delete.js");
    const res = await createDeleteHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(400);
  });

  it("removes passkey using array route params", async () => {
    const { createDeleteHandler } = await import("../account/passkeys-delete.js");
    const res = await createDeleteHandler(services)(
      new Request("http://localhost"),
      { params: Promise.resolve({ id: ["cred-1"] }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.removePasskey).toHaveBeenCalledWith("user-1", "cred-1");
  });
});
