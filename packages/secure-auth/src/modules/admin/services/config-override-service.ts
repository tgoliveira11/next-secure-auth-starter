import type { SecureAuthConfig } from "@/core/types";
import type { ConfigOverrideRepository, AdminConfigOverride } from "../repositories/config-override-repository";

const OVERRIDABLE_KEYS = new Set([
  "auth.magicLink.enabled",
  "auth.securityNotifications.enabled",
  "accountLockout.enabled",
  "invites.enabled",
  "invites.requireApproval",
  "invites.requireInviteCode",
  "invites.defaultQuotaPerUser",
  "invites.codeExpiryDays",
  "passwordPolicy.enforcement",
  "passwordPolicy.minLength",
  "passwordPolicy.checkBreachedPasswords",
  "sessions.maxAgeSeconds",
  "sessions.singleActiveSession",
  "profile.enabled",
  "apiKeys.enabled",
]);

function setNestedPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

type ConfigOverrideServiceDeps = {
  config: SecureAuthConfig;
  configOverrideRepository: ConfigOverrideRepository;
};

export function createConfigOverrideService({ config, configOverrideRepository }: ConfigOverrideServiceDeps) {
  let cache: Map<string, unknown> | null = null;
  let cacheLoadedAt = 0;
  const ttlMs = (config.admin?.configCacheTtlSeconds ?? 60) * 1000;

  async function loadCache(): Promise<Map<string, unknown>> {
    const rows = await configOverrideRepository.getAll();
    cache = new Map(rows.map((r) => [r.key, r.value]));
    cacheLoadedAt = Date.now();
    return cache;
  }

  async function getOverrides(): Promise<Map<string, unknown>> {
    if (cache && (ttlMs === 0 || Date.now() - cacheLoadedAt < ttlMs)) {
      return cache;
    }
    return loadCache();
  }

  function invalidateCache(): void {
    cache = null;
    cacheLoadedAt = 0;
  }

  async function applyOverrides(baseConfig: SecureAuthConfig): Promise<SecureAuthConfig> {
    const overrides = await getOverrides();
    if (overrides.size === 0) return baseConfig;
    const merged = JSON.parse(JSON.stringify(baseConfig)) as Record<string, unknown>;
    // Remove non-serializable fields that will be re-attached
    delete merged.db;
    delete merged.email;

    for (const [key, value] of overrides) {
      setNestedPath(merged, key, value);
    }

    return { ...(merged as SecureAuthConfig), db: baseConfig.db, email: baseConfig.email };
  }

  async function setOverride(key: string, value: unknown, adminId: string): Promise<void> {
    if (!OVERRIDABLE_KEYS.has(key)) {
      throw new Error(`Key "${key}" is not overridable via admin panel`);
    }
    await configOverrideRepository.set(key, value, adminId);
    invalidateCache();
  }

  async function deleteOverride(key: string): Promise<void> {
    await configOverrideRepository.delete(key);
    invalidateCache();
  }

  async function listOverrides(): Promise<AdminConfigOverride[]> {
    return configOverrideRepository.getAll();
  }

  async function listAllKeys(baseConfig: SecureAuthConfig): Promise<Array<{ key: string; source: "admin" | "env" | "default"; value: unknown }>> {
    const overrides = await getOverrides();

    function getNestedValue(obj: unknown, path: string): unknown {
      const parts = path.split(".");
      let current: unknown = obj;
      for (const part of parts) {
        if (current === null || current === undefined || typeof current !== "object") return undefined;
        current = (current as Record<string, unknown>)[part];
      }
      return current;
    }

    return Array.from(OVERRIDABLE_KEYS).map((key) => {
      if (overrides.has(key)) {
        return { key, source: "admin" as const, value: overrides.get(key) };
      }
      const envValue = getNestedValue(baseConfig, key);
      return {
        key,
        source: envValue !== undefined ? "env" as const : "default" as const,
        value: envValue,
      };
    });
  }

  return {
    getOverrides,
    applyOverrides,
    setOverride,
    deleteOverride,
    listOverrides,
    listAllKeys,
    invalidateCache,
  };
}

export type ConfigOverrideService = ReturnType<typeof createConfigOverrideService>;
