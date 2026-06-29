import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { SecureAuthConfig } from "@/core/types";
import type { ApiKeyRepository, ApiKey } from "../repositories/api-key-repository";

const BCRYPT_COST = 10;

export type ApiKeyPrincipal = {
  keyId: string;
  name: string;
  scopes: string[];
  createdBy?: string | null;
  expiresAt?: Date | null;
};

type ApiKeyServiceDeps = {
  config: SecureAuthConfig;
  apiKeyRepository: ApiKeyRepository;
};

export function createApiKeyService({ config, apiKeyRepository }: ApiKeyServiceDeps) {
  function isEnabled() { return config.apiKeys?.enabled === true; }

  async function createKey(data: {
    name: string;
    scopes?: string[];
    createdBy?: string;
    expiryDays?: number | null;
  }): Promise<{ rawKey: string; apiKey: ApiKey }> {
    const rawKey = `sa_${randomBytes(24).toString("base64url")}`;
    const keyPrefix = rawKey.slice(0, 8);
    const keyHash = await bcrypt.hash(rawKey, BCRYPT_COST);

    let expiresAt: Date | null = null;
    const expiryDays = data.expiryDays !== undefined ? data.expiryDays : (config.apiKeys?.defaultExpiryDays ?? 365);
    if (expiryDays && expiryDays > 0) {
      expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    }

    const apiKey = await apiKeyRepository.create({
      name: data.name,
      keyHash,
      keyPrefix,
      scopes: data.scopes ?? [],
      createdBy: data.createdBy,
      expiresAt,
    });

    return { rawKey, apiKey };
  }

  async function validateKey(rawKey: string): Promise<ApiKeyPrincipal | null> {
    if (!rawKey || rawKey.length < 8) return null;
    const prefix = rawKey.slice(0, 8);
    const candidates = await apiKeyRepository.findByPrefix(prefix);

    for (const key of candidates) {
      if (key.revokedAt) continue;
      if (key.expiresAt && key.expiresAt < new Date()) continue;
      const match = await bcrypt.compare(rawKey, key.keyHash);
      if (match) {
        await apiKeyRepository.touch(key.id);
        return {
          keyId: key.id,
          name: key.name,
          scopes: key.scopes,
          createdBy: key.createdBy,
          expiresAt: key.expiresAt,
        };
      }
    }
    return null;
  }

  async function revokeKey(keyId: string, adminId: string): Promise<void> {
    await apiKeyRepository.revoke(keyId, adminId);
  }

  async function listKeys(): Promise<Omit<ApiKey, "keyHash">[]> {
    const keys = await apiKeyRepository.listAll();
    return keys.map(({ keyHash: _, ...rest }) => rest);
  }

  return { isEnabled, createKey, validateKey, revokeKey, listKeys };
}

export type ApiKeyService = ReturnType<typeof createApiKeyService>;
