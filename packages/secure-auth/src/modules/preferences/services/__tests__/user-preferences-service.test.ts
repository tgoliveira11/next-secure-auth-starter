import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUserPreferencesService } from "../user-preferences-service.js";
import type { SecureAuthConfig } from "@/core/types.js";
import {
  PreferenceKeyLimitError,
  PreferenceNamespaceForbiddenError,
  PreferenceNotFoundError,
  PreferencesDisabledError,
} from "../../lib/preferences-errors.js";
import { PreferenceValidationError } from "../../lib/preference-limits.js";

const mocks = vi.hoisted(() => ({
  listByNamespace: vi.fn(),
  get: vi.fn(),
  countByNamespace: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  enforceRateLimit: vi.fn(),
}));

function buildConfig(overrides: Partial<SecureAuthConfig> = {}): SecureAuthConfig {
  return {
    app: { name: "Demo", slug: "demo-app", baseUrl: "http://localhost:3000" },
    auth: {
      afterLoginPath: "/dashboard",
      afterLogoutPath: "/",
      requireEmailVerificationBeforeSignIn: false,
      nextAuthSecret: "secret",
      twoFactorEncryptionKey: "key",
    },
    email: { from: "noreply@test.com", provider: { send: vi.fn() } },
    webauthn: { rpId: "localhost", rpName: "Demo", origin: "http://localhost:3000" },
    preferences: { enabled: true },
    db: {} as SecureAuthConfig["db"],
    ...overrides,
  } as SecureAuthConfig;
}

function buildService(configOverrides: Partial<SecureAuthConfig> = {}) {
  const config = buildConfig(configOverrides);
  return createUserPreferencesService({
    config,
    userPreferencesRepository: {
      listByNamespace: mocks.listByNamespace,
      get: mocks.get,
      countByNamespace: mocks.countByNamespace,
      upsert: mocks.upsert,
      delete: mocks.delete,
    },
    rateLimit: { enforceRateLimit: mocks.enforceRateLimit } as never,
  });
}

describe("user-preferences-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.listByNamespace.mockResolvedValue([]);
    mocks.get.mockResolvedValue(null);
    mocks.countByNamespace.mockResolvedValue(0);
    mocks.upsert.mockImplementation(async (_userId, _ns, key, value) => ({
      userId: "user-1",
      namespace: "demo-app",
      key,
      value,
      updatedAt: new Date(),
    }));
    mocks.delete.mockResolvedValue(true);
  });

  it("throws when feature is disabled", async () => {
    const service = buildService({ preferences: { enabled: false } });
    await expect(service.list("user-1", null)).rejects.toBeInstanceOf(PreferencesDisabledError);
  });

  it("defaults namespace to app.slug", async () => {
    const service = buildService();
    await service.list("user-1", null);
    expect(mocks.listByNamespace).toHaveBeenCalledWith("user-1", "demo-app");
  });

  it("rejects disallowed namespaces", async () => {
    const service = buildService();
    await expect(service.list("user-1", "other-app")).rejects.toBeInstanceOf(
      PreferenceNamespaceForbiddenError
    );
  });

  it("allows extra configured namespaces", async () => {
    const service = buildService({
      preferences: { enabled: true, allowedNamespaces: ["widgets"] },
    });
    await service.list("user-1", "widgets");
    expect(mocks.listByNamespace).toHaveBeenCalledWith("user-1", "widgets");
  });

  it("rejects writes to secure-auth namespace", async () => {
    const service = buildService();
    await expect(
      service.set("user-1", "ui.colorScheme", "dark", "secure-auth")
    ).rejects.toBeInstanceOf(PreferenceNamespaceForbiddenError);
  });

  it("upserts a preference value", async () => {
    const service = buildService();
    const result = await service.set("user-1", "theme", "dark", null);
    expect(result).toEqual({ namespace: "demo-app", key: "theme", value: "dark" });
    expect(mocks.upsert).toHaveBeenCalledWith("user-1", "demo-app", "theme", "dark");
  });

  it("enforces max keys when creating a new key", async () => {
    const service = buildService({
      preferences: { enabled: true, maxKeysPerUser: 1 },
    });
    mocks.get.mockResolvedValue(null);
    mocks.countByNamespace.mockResolvedValue(1);
    await expect(service.set("user-1", "theme", "dark", null)).rejects.toBeInstanceOf(
      PreferenceKeyLimitError
    );
  });

  it("rejects oversized values", async () => {
    const service = buildService({
      preferences: { enabled: true, maxValueBytes: 16 },
    });
    await expect(
      service.set("user-1", "theme", { data: "x".repeat(100) }, null)
    ).rejects.toBeInstanceOf(PreferenceValidationError);
  });

  it("patches multiple entries", async () => {
    const service = buildService();
    mocks.listByNamespace.mockResolvedValue([{ key: "theme", value: "light" }]);
    const result = await service.patch("user-1", { theme: "dark", sidebar: true }, null);
    expect(result.updated).toEqual(["theme", "sidebar"]);
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
  });

  it("throws when deleting a missing key", async () => {
    const service = buildService();
    mocks.delete.mockResolvedValue(false);
    await expect(service.remove("user-1", "missing", null)).rejects.toBeInstanceOf(
      PreferenceNotFoundError
    );
  });

  it("throws when getting a missing key", async () => {
    const service = buildService();
    mocks.get.mockResolvedValue(null);
    await expect(service.get("user-1", "missing", null)).rejects.toBeInstanceOf(
      PreferenceNotFoundError
    );
  });

  it("allows reading secure-auth namespace", async () => {
    const service = buildService();
    await service.list("user-1", "secure-auth");
    expect(mocks.listByNamespace).toHaveBeenCalledWith("user-1", "secure-auth");
  });

  it("enforces max keys when patching new keys", async () => {
    const service = buildService({
      preferences: { enabled: true, maxKeysPerUser: 1 },
    });
    mocks.listByNamespace.mockResolvedValue([]);
    await expect(
      service.patch("user-1", { a: 1, b: 2 }, null)
    ).rejects.toBeInstanceOf(PreferenceKeyLimitError);
  });

  it("returns empty updated list for empty patch", async () => {
    const service = buildService();
    const result = await service.patch("user-1", {}, null);
    expect(result.updated).toEqual([]);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
