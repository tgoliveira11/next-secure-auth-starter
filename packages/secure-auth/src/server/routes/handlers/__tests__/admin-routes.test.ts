import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestServices } from "@/test/helpers/mock-services";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  requireMutatingAdminUser: vi.fn(),
  listUsers: vi.fn(),
  approveUser: vi.fn(),
  listLockedAccounts: vi.fn(),
  listFrozenAccounts: vi.fn(),
  unlockByUserId: vi.fn(),
  listCodes: vi.fn(),
  generateCode: vi.fn(),
  revokeCode: vi.fn(),
  listKeys: vi.fn(),
  createKey: vi.fn(),
  revokeKey: vi.fn(),
  listAllKeys: vi.fn(),
  setOverride: vi.fn(),
  deleteOverride: vi.fn(),
}));

vi.mock("@/modules/admin/lib/require-admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/admin/lib/require-admin")>();
  return { ...actual, requireAdminUser: mocks.requireAdminUser, requireMutatingAdminUser: mocks.requireMutatingAdminUser };
});

import {
  AdminDisabledError,
  ForbiddenError,
} from "@/modules/admin/lib/require-admin";
import { UnauthorizedError } from "@/modules/auth/lib/session";

const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";
const INVITE_ID = "00000000-0000-4000-8000-000000000003";
const KEY_ID = "00000000-0000-4000-8000-000000000004";

let services: SecureAuthServices;

const adminSession = {
  session: { id: ADMIN_ID, email: "admin@example.com" },
  user: { id: ADMIN_ID, role: "admin" as const },
};

async function buildServices() {
  return getTestServices({ admin: { enabled: true, path: "/admin" } }, (base) => ({
    adminService: {
      ...base.adminService,
      listUsers: mocks.listUsers,
      approveUser: mocks.approveUser,
    },
    lockoutService: {
      ...base.lockoutService,
      listLockedAccounts: mocks.listLockedAccounts,
      listFrozenAccounts: mocks.listFrozenAccounts,
      unlockByUserId: mocks.unlockByUserId,
    },
    inviteService: {
      ...base.inviteService,
      listCodes: mocks.listCodes,
      generateCode: mocks.generateCode,
      revokeCode: mocks.revokeCode,
    },
    apiKeyService: {
      ...base.apiKeyService,
      listKeys: mocks.listKeys,
      createKey: mocks.createKey,
      revokeKey: mocks.revokeKey,
    },
    configOverrideService: {
      ...base.configOverrideService,
      listAllKeys: mocks.listAllKeys,
      setOverride: mocks.setOverride,
      deleteOverride: mocks.deleteOverride,
    },
  }));
}

describe("admin API routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireAdminUser.mockResolvedValue(adminSession);
    mocks.requireMutatingAdminUser.mockImplementation(async (_request, svc) => mocks.requireAdminUser(svc));
    mocks.listUsers.mockResolvedValue({ users: [], total: 0 });
    mocks.listLockedAccounts.mockResolvedValue([]);
    mocks.listFrozenAccounts.mockResolvedValue([]);
    mocks.unlockByUserId.mockResolvedValue(undefined);
    mocks.approveUser.mockResolvedValue(null);
    mocks.listCodes.mockResolvedValue([]);
    mocks.generateCode.mockResolvedValue({ code: "ABC123" });
    mocks.revokeCode.mockResolvedValue(undefined);
    mocks.listKeys.mockResolvedValue([]);
    mocks.createKey.mockResolvedValue({
      rawKey: "secret",
      apiKey: { id: KEY_ID, name: "CI key", keyHash: "hash" },
    });
    mocks.revokeKey.mockResolvedValue(undefined);
    mocks.listAllKeys.mockResolvedValue([]);
    mocks.setOverride.mockResolvedValue(undefined);
    mocks.deleteOverride.mockResolvedValue(undefined);
    services = await buildServices();
  });

  it("GET /admin/users returns list", async () => {
    const { createGetHandler } = await import("../admin/admin-users.js");
    const res = await createGetHandler(services)(
      new Request("http://localhost/api/auth/admin/users?role=admin&limit=10")
    );
    expect(res.status).toBe(200);
    expect(mocks.listUsers).toHaveBeenCalled();
  });

  it("PATCH /admin/users returns 400 without id", async () => {
    const { createPostHandler } = await import("../admin/admin-users.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ role: "admin" }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(res.status).toBe(400);
  });

  it("PATCH /admin/users updates role", async () => {
    const setUserRole = vi.fn().mockResolvedValue({ id: USER_ID, role: "admin" });
    services = await getTestServices({ admin: { enabled: true, path: "/admin" } }, (base) => ({
      adminService: { ...base.adminService, setUserRole },
    }));
    const { createPostHandler } = await import("../admin/admin-users.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ role: "admin" }),
      }),
      { params: Promise.resolve({ id: USER_ID }) }
    );
    expect(res.status).toBe(200);
    expect(setUserRole).toHaveBeenCalledWith(USER_ID, "admin", ADMIN_ID);
  });

  it("PATCH /admin/users returns 422 for policy errors", async () => {
    const setUserRole = vi.fn().mockResolvedValue({ error: "Cannot demote last admin" });
    services = await getTestServices({ admin: { enabled: true, path: "/admin" } }, (base) => ({
      adminService: { ...base.adminService, setUserRole },
    }));
    const { createPostHandler } = await import("../admin/admin-users.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ role: "user" }),
      }),
      { params: Promise.resolve({ id: USER_ID }) }
    );
    expect(res.status).toBe(422);
  });

  it("PATCH /admin/users rejects pending status changes", async () => {
    const { createPostHandler } = await import("../admin/admin-users.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ status: "pending" }),
      }),
      { params: Promise.resolve({ id: USER_ID }) }
    );
    expect(res.status).toBe(422);
  });

  it("POST /admin/config returns 422 for non-overridable keys", async () => {
    mocks.setOverride.mockRejectedValue(new Error("Key is not overridable"));
    const { createPostHandler } = await import("../admin/admin-config.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ key: "invalid.key", value: true }),
      })
    );
    expect(res.status).toBe(422);
  });

  it("admin routes return 404 when admin disabled", async () => {
    mocks.requireAdminUser.mockRejectedValue(new AdminDisabledError());
    const { createGetHandler } = await import("../admin/admin-users.js");
    const res = await createGetHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(404);
  });

  it("admin routes return 403 for non-admin", async () => {
    mocks.requireAdminUser.mockRejectedValue(new ForbiddenError());
    const { createGetHandler } = await import("../admin/admin-locks.js");
    const res = await createGetHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(403);
  });

  it("GET /admin/locks returns locked and frozen lists", async () => {
    const { createGetHandler } = await import("../admin/admin-locks.js");
    const res = await createGetHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ locked: [], frozen: [] });
  });

  it("POST /admin/locks unlocks account with valid userId", async () => {
    const { createPostHandler } = await import("../admin/admin-locks.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ userId: USER_ID }),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.unlockByUserId).toHaveBeenCalledWith(USER_ID, ADMIN_ID);
  });

  it("POST /admin/locks returns 400 without userId", async () => {
    const { createPostHandler } = await import("../admin/admin-locks.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) })
    );
    expect(res.status).toBe(400);
  });

  it("GET /admin/waitlist returns pending users", async () => {
    const { createGetHandler } = await import("../admin/admin-waitlist.js");
    const res = await createGetHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(200);
    expect(mocks.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" })
    );
  });

  it("POST /admin/waitlist returns 404 for unknown user", async () => {
    const { createPostHandler } = await import("../admin/admin-waitlist.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ userId: USER_ID }),
      })
    );
    expect(res.status).toBe(404);
  });

  it("GET /admin/invites returns invite codes", async () => {
    const { createGetHandler } = await import("../admin/admin-invites.js");
    const res = await createGetHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(200);
  });

  it("POST /admin/invites creates invite", async () => {
    const { createPostHandler } = await import("../admin/admin-invites.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ maxUses: 1 }),
      })
    );
    expect(res.status).toBe(201);
  });

  it("DELETE /admin/invites revokes invite", async () => {
    const { createDeleteHandler } = await import("../admin/admin-invites.js");
    const res = await createDeleteHandler(services)(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ codeId: INVITE_ID }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("GET /admin/api-keys returns keys", async () => {
    const { createGetHandler } = await import("../admin/admin-api-keys.js");
    const res = await createGetHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(200);
  });

  it("POST /admin/api-keys creates key", async () => {
    const { createPostHandler } = await import("../admin/admin-api-keys.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ name: "CI key" }),
      })
    );
    expect(res.status).toBe(201);
  });

  it("DELETE /admin/api-keys revokes key", async () => {
    const { createDeleteHandler } = await import("../admin/admin-api-keys.js");
    const res = await createDeleteHandler(services)(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ keyId: KEY_ID }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("GET /admin/config returns override keys", async () => {
    const { createGetHandler } = await import("../admin/admin-config.js");
    const res = await createGetHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(200);
  });

  it("POST /admin/config sets override", async () => {
    const { createPostHandler } = await import("../admin/admin-config.js");
    const res = await createPostHandler(services)(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ key: "auth.magicLink.enabled", value: true }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("DELETE /admin/config removes override", async () => {
    const { createDeleteHandler } = await import("../admin/admin-config.js");
    const res = await createDeleteHandler(services)(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ key: "auth.magicLink.enabled" }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("admin routes return 401 when unauthenticated", async () => {
    mocks.requireAdminUser.mockRejectedValue(new UnauthorizedError("Authentication required"));
    const { createGetHandler } = await import("../admin/admin-api-keys.js");
    const res = await createGetHandler(services)(new Request("http://localhost"));
    expect(res.status).toBe(401);
  });
});
