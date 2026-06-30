import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestServices } from "@/test/helpers/mock-services";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  requireVerifiedMutatingAccountUser: vi.fn(),
  revokeSession: vi.fn(),
}));

vi.mock("@/modules/auth/lib/route-auth", () => ({
  requireVerifiedMutatingAccountUser: mocks.requireVerifiedMutatingAccountUser,
}));

let services: SecureAuthServices;

describe("sessions delete route", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireVerifiedMutatingAccountUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      accountSessionId: "current-session",
    });
    mocks.revokeSession.mockResolvedValue({ revoked: true, signOut: false });
    services = await getTestServices({}, (base) => ({
      accountSessionService: {
        ...base.accountSessionService,
        revokeSession: mocks.revokeSession,
      },
    }));
  });

  it("returns 400 without route context", async () => {
    const { createDeleteHandler } = await import("../account/sessions-delete.js");
    const res = await createDeleteHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(400);
  });

  it("returns 400 without session id", async () => {
    const { createDeleteHandler } = await import("../account/sessions-delete.js");
    const res = await createDeleteHandler(services)(
      new Request("http://localhost"),
      { params: Promise.resolve({}) }
    );
    expect(res.status).toBe(400);
  });

  it("revokes a session by id", async () => {
    const { createDeleteHandler } = await import("../account/sessions-delete.js");
    const res = await createDeleteHandler(services)(
      new Request("http://localhost"),
      { params: Promise.resolve({ id: "session-2" }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.revokeSession).toHaveBeenCalledWith(
      "user-1",
      "session-2",
      "current-session",
      expect.any(String)
    );
  });

  it("accepts array route params", async () => {
    const { createDeleteHandler } = await import("../account/sessions-delete.js");
    const res = await createDeleteHandler(services)(
      new Request("http://localhost"),
      { params: Promise.resolve({ id: ["session-3"] }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.revokeSession).toHaveBeenCalledWith(
      "user-1",
      "session-3",
      "current-session",
      expect.any(String)
    );
  });
});
