import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestServices } from "@/test/helpers/mock-services";
import {
  AdminDisabledError,
  ForbiddenError,
  requireAdminUser,
  requireMutatingAdminUser,
} from "../require-admin";
import { UnauthorizedError } from "@/modules/auth/lib/session";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  findById: vi.fn(),
  isEnabled: vi.fn(),
}));

vi.mock("@/modules/auth/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/lib/session")>();
  return { ...actual, requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser };
});

let services: SecureAuthServices;

describe("requireAdminUser", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.isEnabled.mockReturnValue(true);
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: "admin-1", email: "admin@example.com" });
    mocks.findById.mockResolvedValue({ id: "admin-1", role: "admin" });
    services = await getTestServices({}, (base) => ({
      adminService: { ...base.adminService, isEnabled: mocks.isEnabled },
      repos: {
        ...base.repos,
        adminUserRepository: {
          ...base.repos.adminUserRepository,
          findById: mocks.findById,
        },
      },
    }));
  });

  it("returns session and admin user when authorized", async () => {
    const result = await requireAdminUser(services);
    expect(result.session.id).toBe("admin-1");
    expect(result.user.role).toBe("admin");
  });

  it("throws AdminDisabledError when admin panel is off", async () => {
    mocks.isEnabled.mockReturnValue(false);
    await expect(requireAdminUser(services)).rejects.toBeInstanceOf(AdminDisabledError);
  });

  it("throws UnauthorizedError without session", async () => {
    mocks.requireFullyAuthenticatedUser.mockRejectedValue(new UnauthorizedError("Authentication required"));
    await expect(requireAdminUser(services)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws ForbiddenError for non-admin users", async () => {
    mocks.findById.mockResolvedValue({ id: "user-1", role: "user" });
    await expect(requireAdminUser(services)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws ForbiddenError when admin user record is missing", async () => {
    mocks.findById.mockResolvedValue(null);
    await expect(requireAdminUser(services)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("requireMutatingAdminUser", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.isEnabled.mockReturnValue(true);
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: "admin-1", email: "admin@example.com" });
    mocks.findById.mockResolvedValue({ id: "admin-1", role: "admin" });
    services = await getTestServices(
      {
        app: { name: "Test App", slug: "test-app", baseUrl: "http://localhost:3001" },
      },
      (base) => ({
      adminService: { ...base.adminService, isEnabled: mocks.isEnabled },
      repos: {
        ...base.repos,
        adminUserRepository: {
          ...base.repos.adminUserRepository,
          findById: mocks.findById,
        },
      },
    }));
  });

  it("requires same-origin before admin authorization", async () => {
    const request = new Request("http://localhost:3001/api/auth/admin/config", {
      method: "POST",
      headers: { Origin: "http://evil.example" },
    });
    await expect(requireMutatingAdminUser(request, services)).rejects.toMatchObject({
      name: "SameOriginError",
    });
  });

  it("returns admin session when origin is allowed", async () => {
    const request = new Request("http://localhost:3001/api/auth/admin/config", {
      method: "POST",
      headers: { Origin: "http://localhost:3001" },
    });
    const result = await requireMutatingAdminUser(request, services);
    expect(result.session.id).toBe("admin-1");
  });
});
