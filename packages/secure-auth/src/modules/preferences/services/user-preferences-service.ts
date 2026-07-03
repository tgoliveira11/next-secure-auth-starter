import type { SecureAuthConfig } from "@/core/types";
import type { RateLimitApi } from "@/modules/rate-limit/index.js";
import {
  assertValidNamespace,
  assertValidPreferenceKey,
  assertWithinValueSizeLimit,
  resolvePreferenceLimits,
} from "../lib/preference-limits.js";
import {
  PreferenceKeyLimitError,
  PreferenceNamespaceForbiddenError,
  PreferenceNotFoundError,
  PreferencesDisabledError,
} from "../lib/preferences-errors.js";
import { SECURE_AUTH_PREFERENCES_NAMESPACE } from "../lib/well-known-keys.js";
import type { UserPreferencesRepository } from "../repositories/user-preferences-repository.js";

export type UserPreferencesServiceDeps = {
  config: SecureAuthConfig;
  userPreferencesRepository: UserPreferencesRepository;
  rateLimit: RateLimitApi;
};

export function createUserPreferencesService(deps: UserPreferencesServiceDeps) {
  const { config, userPreferencesRepository, rateLimit } = deps;
  const limits = resolvePreferenceLimits(config);

  function isEnabled(): boolean {
    return config.preferences?.enabled === true;
  }

  function assertEnabled(): void {
    if (!isEnabled()) {
      throw new PreferencesDisabledError();
    }
  }

  function allowedNamespaces(): Set<string> {
    const allowed = new Set<string>([config.app.slug, SECURE_AUTH_PREFERENCES_NAMESPACE]);
    for (const ns of config.preferences?.allowedNamespaces ?? []) {
      allowed.add(ns);
    }
    return allowed;
  }

  function resolveNamespace(requested?: string | null): string {
    assertEnabled();
    const namespace = requested?.trim() || config.app.slug;
    assertValidNamespace(namespace);
    if (!allowedNamespaces().has(namespace)) {
      throw new PreferenceNamespaceForbiddenError();
    }
    return namespace;
  }

  function assertMutableNamespace(namespace: string): void {
    if (namespace === SECURE_AUTH_PREFERENCES_NAMESPACE) {
      throw new PreferenceNamespaceForbiddenError();
    }
  }

  async function enforceWriteRateLimit(userId: string, ip: string | undefined, endpoint: string) {
    await rateLimit.enforceRateLimit({
      operation: "account.preferences_write",
      userId,
      ip,
      endpoint,
    });
  }

  async function enforceReadRateLimit(userId: string, ip: string | undefined, endpoint: string) {
    await rateLimit.enforceRateLimit({
      operation: "account.preferences_read",
      userId,
      ip,
      endpoint,
    });
  }

  async function list(userId: string, namespaceInput: string | null | undefined, ip?: string) {
    const namespace = resolveNamespace(namespaceInput);
    await enforceReadRateLimit(userId, ip, "/api/account/preferences");
    const rows = await userPreferencesRepository.listByNamespace(userId, namespace);
    const entries: Record<string, unknown> = {};
    for (const row of rows) {
      entries[row.key] = row.value;
    }
    return { namespace, entries };
  }

  async function get(
    userId: string,
    key: string,
    namespaceInput: string | null | undefined,
    ip?: string
  ) {
    const namespace = resolveNamespace(namespaceInput);
    assertValidPreferenceKey(key);
    await enforceReadRateLimit(userId, ip, "/api/account/preferences/:key");
    const row = await userPreferencesRepository.get(userId, namespace, key);
    if (!row) {
      throw new PreferenceNotFoundError();
    }
    return { namespace, key: row.key, value: row.value };
  }

  async function set(
    userId: string,
    key: string,
    value: unknown,
    namespaceInput: string | null | undefined,
    ip?: string
  ) {
    const namespace = resolveNamespace(namespaceInput);
    assertMutableNamespace(namespace);
    assertValidPreferenceKey(key);
    assertWithinValueSizeLimit(value, limits.maxValueBytes);
    await enforceWriteRateLimit(userId, ip, "/api/account/preferences/:key");

    const existing = await userPreferencesRepository.get(userId, namespace, key);
    if (!existing) {
      const count = await userPreferencesRepository.countByNamespace(userId, namespace);
      if (count >= limits.maxKeysPerUser) {
        throw new PreferenceKeyLimitError();
      }
    }

    const row = await userPreferencesRepository.upsert(userId, namespace, key, value);
    return { namespace, key: row.key, value: row.value };
  }

  async function patch(
    userId: string,
    entries: Record<string, unknown>,
    namespaceInput: string | null | undefined,
    ip?: string
  ) {
    const namespace = resolveNamespace(namespaceInput);
    assertMutableNamespace(namespace);
    await enforceWriteRateLimit(userId, ip, "/api/account/preferences");

    const keys = Object.keys(entries);
    if (keys.length === 0) {
      return { namespace, updated: [] as string[] };
    }

    for (const key of keys) {
      assertValidPreferenceKey(key);
      assertWithinValueSizeLimit(entries[key], limits.maxValueBytes);
    }

    const existingRows = await userPreferencesRepository.listByNamespace(userId, namespace);
    const existingKeys = new Set(existingRows.map((row) => row.key));
    const newKeys = keys.filter((key) => !existingKeys.has(key));

    if (existingKeys.size + newKeys.length > limits.maxKeysPerUser) {
      throw new PreferenceKeyLimitError();
    }

    const updated: string[] = [];
    for (const key of keys) {
      await userPreferencesRepository.upsert(userId, namespace, key, entries[key]);
      updated.push(key);
    }

    return { namespace, updated };
  }

  async function remove(
    userId: string,
    key: string,
    namespaceInput: string | null | undefined,
    ip?: string
  ) {
    const namespace = resolveNamespace(namespaceInput);
    assertMutableNamespace(namespace);
    assertValidPreferenceKey(key);
    await enforceWriteRateLimit(userId, ip, "/api/account/preferences/:key");

    const deleted = await userPreferencesRepository.delete(userId, namespace, key);
    if (!deleted) {
      throw new PreferenceNotFoundError();
    }

    return { namespace, key, deleted: true as const };
  }

  return {
    isEnabled,
    list,
    get,
    set,
    patch,
    remove,
  };
}

export type UserPreferencesService = ReturnType<typeof createUserPreferencesService>;
