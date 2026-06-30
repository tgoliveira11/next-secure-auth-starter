import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestServices } from "@/test/helpers/mock-services";
import { UnauthorizedError } from "@/modules/auth/lib/session";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("@/modules/auth/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/lib/session")>();
  return { ...actual, getSessionUser: mocks.getSessionUser };
});

let services: SecureAuthServices;

async function buildServices() {
  return getTestServices({}, (base) => ({
    profileService: {
      ...base.profileService,
      getProfile: mocks.getProfile,
      updateProfile: mocks.updateProfile,
    },
  }));
}

describe("account profile API routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.getProfile.mockResolvedValue({ displayName: "Test User" });
    mocks.updateProfile.mockResolvedValue(undefined);
    services = await buildServices();
  });

  it("GET /profile returns 401 without session", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const { createGetHandler } = await import("../account/profile.js");
    const res = await createGetHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(401);
  });

  it("GET /profile returns profile for authenticated user", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    const { createGetHandler } = await import("../account/profile.js");
    const res = await createGetHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ displayName: "Test User" });
  });

  it("PATCH /profile updates display name", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    const { createPostHandler } = await import("../account/profile.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ displayName: "Updated" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.updateProfile).toHaveBeenCalledWith("user-1", { displayName: "Updated" });
  });

  it("PATCH /profile returns 400 for invalid input", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    const { createPostHandler } = await import("../account/profile.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ avatarUrl: "not-a-url" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("PATCH /profile returns 401 when session helper throws", async () => {
    mocks.getSessionUser.mockRejectedValue(new UnauthorizedError("Authentication required"));
    const { createPostHandler } = await import("../account/profile.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ displayName: "Updated" }),
      })
    );
    expect(res.status).toBe(401);
  });
});
