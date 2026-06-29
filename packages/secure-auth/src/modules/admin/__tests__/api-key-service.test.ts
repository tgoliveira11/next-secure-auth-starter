import { describe, it, expect, vi } from "vitest";
import { createApiKeyService } from "../services/api-key-service";
import type { ApiKeyRepository, ApiKey } from "../repositories/api-key-repository";

function buildRepo(overrides?: Partial<ApiKeyRepository>): ApiKeyRepository {
  const store = new Map<string, ApiKey>();

  return {
    create: vi.fn(async (data) => {
      const key: ApiKey = {
        id: "key-id-1",
        name: data.name,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
        scopes: data.scopes,
        createdBy: data.createdBy ?? null,
        lastUsedAt: null,
        expiresAt: data.expiresAt ?? null,
        revokedAt: null,
        revokedBy: null,
        createdAt: new Date(),
      };
      store.set(key.id, key);
      return key;
    }),
    findByPrefix: vi.fn(async (prefix) => {
      return Array.from(store.values()).filter((k) => k.keyPrefix.startsWith(prefix));
    }),
    findById: vi.fn(async (id) => store.get(id) ?? null),
    listAll: vi.fn(async () => Array.from(store.values())),
    revoke: vi.fn(async (id, revokedBy) => {
      const key = store.get(id);
      if (!key || key.revokedAt) return null;
      const updated = { ...key, revokedAt: new Date(), revokedBy };
      store.set(id, updated);
      return updated;
    }),
    touch: vi.fn(async () => {}),
    ...overrides,
  };
}

function buildConfig(enabled = true) {
  return { apiKeys: { enabled } } as Parameters<typeof createApiKeyService>[0]["config"];
}

describe("api-key-service", () => {
  it("creates a key with prefix and hash", async () => {
    const repo = buildRepo();
    const service = createApiKeyService({ config: buildConfig(), apiKeyRepository: repo });
    const { rawKey, apiKey } = await service.createKey({ name: "test" });
    expect(rawKey).toMatch(/^sa_/);
    expect(apiKey.keyPrefix).toBe(rawKey.slice(0, 8));
    expect(apiKey.keyHash).not.toBe(rawKey);
  });

  it("validateKey: returns null for unknown prefix", async () => {
    const repo = buildRepo({ findByPrefix: vi.fn(async () => []) });
    const service = createApiKeyService({ config: buildConfig(), apiKeyRepository: repo });
    const principal = await service.validateKey("sa_unknownkey");
    expect(principal).toBeNull();
  });

  it("validateKey: returns principal for valid key", async () => {
    const repo = buildRepo();
    const service = createApiKeyService({ config: buildConfig(), apiKeyRepository: repo });
    const { rawKey } = await service.createKey({ name: "my-service" });
    const principal = await service.validateKey(rawKey);
    expect(principal).not.toBeNull();
    expect(principal?.name).toBe("my-service");
  });

  it("validateKey: returns null for revoked key", async () => {
    const repo = buildRepo();
    const service = createApiKeyService({ config: buildConfig(), apiKeyRepository: repo });
    const { rawKey, apiKey } = await service.createKey({ name: "revoked-key" });
    await service.revokeKey(apiKey.id, "admin-id");
    const principal = await service.validateKey(rawKey);
    expect(principal).toBeNull();
  });

  it("validateKey: returns null for expired key", async () => {
    const repo = buildRepo({
      findByPrefix: vi.fn(async () => [{
        id: "k1", name: "exp", keyHash: "hash", keyPrefix: "sa_12345", scopes: [],
        createdBy: null, lastUsedAt: null, expiresAt: new Date(Date.now() - 1000),
        revokedAt: null, revokedBy: null, createdAt: new Date(),
      }]),
    });
    const service = createApiKeyService({ config: buildConfig(), apiKeyRepository: repo });
    const principal = await service.validateKey("sa_12345678remaining");
    expect(principal).toBeNull();
  });

  it("revokeKey: marks key as revoked", async () => {
    const repo = buildRepo();
    const service = createApiKeyService({ config: buildConfig(), apiKeyRepository: repo });
    const { apiKey } = await service.createKey({ name: "to-revoke" });
    await service.revokeKey(apiKey.id, "admin");
    expect(repo.revoke).toHaveBeenCalledWith(apiKey.id, "admin");
  });
});
