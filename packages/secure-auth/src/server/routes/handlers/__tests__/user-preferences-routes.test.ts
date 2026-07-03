import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestServices } from "@/test/helpers/mock-services";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  requireVerifiedFullyAuthenticatedUser: vi.fn(),
  requireVerifiedMutatingAccountUser: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  patch: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/modules/auth/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/lib/session")>();
  return {
    ...actual,
    requireVerifiedFullyAuthenticatedUser: mocks.requireVerifiedFullyAuthenticatedUser,
  };
});

vi.mock("@/modules/auth/lib/route-auth", () => ({
  requireVerifiedMutatingAccountUser: mocks.requireVerifiedMutatingAccountUser,
}));

let services: SecureAuthServices;

async function buildServices(preferencesEnabled = true) {
  return getTestServices(
    {
      preferences: { enabled: preferencesEnabled },
      app: { name: "Demo", slug: "demo-app", baseUrl: "http://localhost:3000" },
    },
    (base) => ({
      userPreferencesService: {
        ...base.userPreferencesService,
        list: mocks.list,
        get: mocks.get,
        set: mocks.set,
        patch: mocks.patch,
        remove: mocks.remove,
      },
    })
  );
}

describe("account preferences API routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireVerifiedFullyAuthenticatedUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    mocks.requireVerifiedMutatingAccountUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    mocks.list.mockResolvedValue({ namespace: "demo-app", entries: { theme: "dark" } });
    mocks.get.mockResolvedValue({ namespace: "demo-app", key: "theme", value: "dark" });
    mocks.set.mockResolvedValue({ namespace: "demo-app", key: "theme", value: "dark" });
    mocks.patch.mockResolvedValue({ namespace: "demo-app", updated: ["theme"] });
    mocks.remove.mockResolvedValue({ namespace: "demo-app", key: "theme", deleted: true });
    services = await buildServices();
  });

  it("GET /preferences returns 404 when feature disabled", async () => {
    services = await buildServices(false);
    const { PreferencesDisabledError } = await import(
      "@/modules/preferences/lib/preferences-errors.js"
    );
    mocks.list.mockRejectedValue(new PreferencesDisabledError());
    const { createGetHandler } = await import("../account/user-preferences-list.js");
    const res = await createGetHandler(services)(new Request("http://localhost/api/account/preferences"));
    expect(res.status).toBe(404);
  });

  it("GET /preferences lists entries for authenticated user", async () => {
    const { createGetHandler } = await import("../account/user-preferences-list.js");
    const res = await createGetHandler(services)(
      new Request("http://localhost/api/account/preferences")
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ namespace: "demo-app", entries: { theme: "dark" } });
  });

  it("PUT /preferences/:key upserts a value", async () => {
    const { createPutHandler } = await import("../account/user-preferences-by-key.js");
    const res = await createPutHandler(services)(
      new Request("http://localhost/api/account/preferences/theme", {
        method: "PUT",
        headers: { origin: "http://localhost:3000" },
        body: JSON.stringify({ value: "dark" }),
      }),
      { params: Promise.resolve({ key: "theme" }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.set).toHaveBeenCalledWith("user-1", "theme", "dark", "demo-app", expect.any(String));
  });

  it("PATCH /preferences merges entries", async () => {
    const { createPatchHandler } = await import("../account/user-preferences-patch.js");
    const res = await createPatchHandler(services)(
      new Request("http://localhost/api/account/preferences", {
        method: "PATCH",
        headers: { origin: "http://localhost:3000" },
        body: JSON.stringify({ entries: { theme: "dark" } }),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.patch).toHaveBeenCalled();
  });

  it("DELETE /preferences/:key removes a key", async () => {
    const { createDeleteHandler } = await import("../account/user-preferences-by-key.js");
    const res = await createDeleteHandler(services)(
      new Request("http://localhost/api/account/preferences/theme", {
        method: "DELETE",
        headers: { origin: "http://localhost:3000" },
      }),
      { params: Promise.resolve({ key: "theme" }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith("user-1", "theme", "demo-app", expect.any(String));
  });

  it("GET /preferences/:key returns 404 when missing", async () => {
    const { PreferenceNotFoundError } = await import(
      "@/modules/preferences/lib/preferences-errors.js"
    );
    mocks.get.mockRejectedValue(new PreferenceNotFoundError());
    const { createGetHandler } = await import("../account/user-preferences-by-key.js");
    const res = await createGetHandler(services)(
      new Request("http://localhost/api/account/preferences/missing"),
      { params: Promise.resolve({ key: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("PUT /preferences/:key returns 400 for invalid body", async () => {
    const { createPutHandler } = await import("../account/user-preferences-by-key.js");
    const res = await createPutHandler(services)(
      new Request("http://localhost/api/account/preferences/theme", {
        method: "PUT",
        headers: { origin: "http://localhost:3000" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ key: "theme" }) }
    );
    expect(res.status).toBe(400);
  });

  it("PATCH /preferences returns 400 for invalid body", async () => {
    const { createPatchHandler } = await import("../account/user-preferences-patch.js");
    const res = await createPatchHandler(services)(
      new Request("http://localhost/api/account/preferences", {
        method: "PATCH",
        headers: { origin: "http://localhost:3000" },
        body: JSON.stringify({ notEntries: {} }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 for forbidden namespace", async () => {
    const { PreferenceNamespaceForbiddenError } = await import(
      "@/modules/preferences/lib/preferences-errors.js"
    );
    mocks.set.mockRejectedValue(new PreferenceNamespaceForbiddenError());
    const { createPutHandler } = await import("../account/user-preferences-by-key.js");
    const res = await createPutHandler(services)(
      new Request("http://localhost/api/account/preferences/ui.colorScheme", {
        method: "PUT",
        headers: { origin: "http://localhost:3000" },
        body: JSON.stringify({ value: "dark" }),
      }),
      { params: Promise.resolve({ key: "ui.colorScheme" }) }
    );
    expect(res.status).toBe(403);
  });

  it("GET /preferences/:key returns 400 when key param missing", async () => {
    const { createGetHandler } = await import("../account/user-preferences-by-key.js");
    const res = await createGetHandler(services)(
      new Request("http://localhost/api/account/preferences/theme"),
      { params: Promise.resolve({}) }
    );
    expect(res.status).toBe(400);
  });

  it("PUT /preferences/:key returns 400 when route context missing", async () => {
    const { createPutHandler } = await import("../account/user-preferences-by-key.js");
    const res = await createPutHandler(services)(
      new Request("http://localhost/api/account/preferences/theme", {
        method: "PUT",
        headers: { origin: "http://localhost:3000" },
        body: JSON.stringify({ value: "dark" }),
      })
    );
    expect(res.status).toBe(400);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("DELETE /preferences/:key returns 400 when route context missing", async () => {
    const { createDeleteHandler } = await import("../account/user-preferences-by-key.js");
    const res = await createDeleteHandler(services)(
      new Request("http://localhost/api/account/preferences/theme", {
        method: "DELETE",
        headers: { origin: "http://localhost:3000" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    const { RateLimitError } = await import("@/modules/rate-limit/index.js");
    mocks.list.mockRejectedValue(new RateLimitError("Too many requests"));
    const { createGetHandler } = await import("../account/user-preferences-list.js");
    const res = await createGetHandler(services)(new Request("http://localhost/api/account/preferences"));
    expect(res.status).toBe(429);
  });

  it("passes namespace query param to service", async () => {
    const { createGetHandler } = await import("../account/user-preferences-list.js");
    await createGetHandler(services)(
      new Request("http://localhost/api/account/preferences?namespace=widgets")
    );
    expect(mocks.list).toHaveBeenCalledWith("user-1", "widgets", expect.any(String));
  });
});
