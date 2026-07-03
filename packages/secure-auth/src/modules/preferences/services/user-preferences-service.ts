import type { SecureAuthConfig } from "@/core/types";
import type { RateLimitApi } from "@/modules/rate-limit/index.js";
import {
  assertValidNamespace,
  assertValidPreferenceKey,
  assertWithinValueSizeLimit,
  resolvePreferenceLimits,
} from "../lib/preference-limits.js";
import {
  PreferenceConflictError,
  PreferenceKeyLimitError,
  PreferenceNamespaceForbiddenError,
  PreferenceNotFoundError,
  PreferencesDisabledError,
} from "../lib/preferences-errors.js";
import { etagFromPreferenceRow, etagsMatch } from "../lib/preference-etag.js";
import { SECURE_AUTH_PREFERENCES_NAMESPACE } from "../lib/well-known-keys.js";
import type { UserPreferencesRepository } from "../repositories/user-preferences-repository.js";

export type UserPreferencesServiceDeps = {
  config: SecureAuthConfig;
  userPreferencesRepository: UserPreferencesRepository;
  rateLimit: RateLimitApi;
};

function rowsToEntries(rows: Array<{ key: string; value: unknown; updatedAt: Date }>) {
  const entries: Record<string, unknown> = {};
  const etags: Record<string, string> = {};
  for (const row of rows) {
    entries[row.key] = row.value;
    etags[row.key] = etagFromPreferenceRow(row);
  }
  return { entries, etags };
}

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

  function defaultsForNamespace(namespace: string): Record<string, unknown> | null {
    const byNamespace = config.preferences?.defaultsByNamespace?.[namespace];
    if (byNamespace && Object.keys(byNamespace).length > 0) {
      return byNamespace;
    }
    if (namespace === config.app.slug && config.preferences?.defaults) {
      const defaults = config.preferences.defaults;
      return Object.keys(defaults).length > 0 ? defaults : null;
    }
    return null;
  }

  function assertIfMatchForRow(
    row: { updatedAt: Date } | null,
    ifMatch: string | null | undefined
  ): void {
    if (!ifMatch || !row) return;
    const current = etagFromPreferenceRow(row);
    if (!etagsMatch(current, ifMatch)) {
      throw new PreferenceConflictError();
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

  async function applyDefaultsIfEmpty(userId: string, namespace: string): Promise<void> {
    const count = await userPreferencesRepository.countByNamespace(userId, namespace);
    if (count > 0) return;

    const defaults = defaultsForNamespace(namespace);
    if (!defaults) return;

    for (const [key, value] of Object.entries(defaults)) {
      assertValidPreferenceKey(key);
      assertWithinValueSizeLimit(value, limits.maxValueBytes);
      await userPreferencesRepository.upsert(userId, namespace, key, value);
    }
  }

  async function list(userId: string, namespaceInput: string | null | undefined, ip?: string) {
    const namespace = resolveNamespace(namespaceInput);
    await enforceReadRateLimit(userId, ip, "/api/account/preferences");
    await applyDefaultsIfEmpty(userId, namespace);
    const rows = await userPreferencesRepository.listByNamespace(userId, namespace);
    const { entries, etags } = rowsToEntries(rows);
    return { namespace, entries, etags };
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
    await applyDefaultsIfEmpty(userId, namespace);
    const row = await userPreferencesRepository.get(userId, namespace, key);
    if (!row) {
      throw new PreferenceNotFoundError();
    }
    return {
      namespace,
      key: row.key,
      value: row.value,
      etag: etagFromPreferenceRow(row),
    };
  }

  async function set(
    userId: string,
    key: string,
    value: unknown,
    namespaceInput: string | null | undefined,
    ip?: string,
    ifMatch?: string | null
  ) {
    const namespace = resolveNamespace(namespaceInput);
    assertMutableNamespace(namespace);
    assertValidPreferenceKey(key);
    assertWithinValueSizeLimit(value, limits.maxValueBytes);
    await enforceWriteRateLimit(userId, ip, "/api/account/preferences/:key");

    const existing = await userPreferencesRepository.get(userId, namespace, key);
    assertIfMatchForRow(existing, ifMatch ?? null);

    if (!existing) {
      const count = await userPreferencesRepository.countByNamespace(userId, namespace);
      if (count >= limits.maxKeysPerUser) {
        throw new PreferenceKeyLimitError();
      }
    }

    const row = await userPreferencesRepository.upsert(userId, namespace, key, value);
    return {
      namespace,
      key: row.key,
      value: row.value,
      etag: etagFromPreferenceRow(row),
    };
  }

  async function patch(
    userId: string,
    entries: Record<string, unknown>,
    namespaceInput: string | null | undefined,
    ip?: string,
    ifMatchByKey?: Record<string, string>
  ) {
    const namespace = resolveNamespace(namespaceInput);
    assertMutableNamespace(namespace);
    await enforceWriteRateLimit(userId, ip, "/api/account/preferences");

    const keys = Object.keys(entries);
    if (keys.length === 0) {
      return { namespace, updated: [] as string[], etags: {} as Record<string, string> };
    }

    for (const key of keys) {
      assertValidPreferenceKey(key);
      assertWithinValueSizeLimit(entries[key], limits.maxValueBytes);
    }

    const existingRows = await userPreferencesRepository.listByNamespace(userId, namespace);
    const existingByKey = new Map(existingRows.map((row) => [row.key, row]));
    const existingKeys = new Set(existingRows.map((row) => row.key));
    const newKeys = keys.filter((key) => !existingKeys.has(key));

    if (existingKeys.size + newKeys.length > limits.maxKeysPerUser) {
      throw new PreferenceKeyLimitError();
    }

    for (const key of keys) {
      const existing = existingByKey.get(key);
      if (existing && ifMatchByKey?.[key]) {
        assertIfMatchForRow(existing, ifMatchByKey[key]);
      }
    }

    const updated: string[] = [];
    const etags: Record<string, string> = {};
    for (const key of keys) {
      const row = await userPreferencesRepository.upsert(userId, namespace, key, entries[key]);
      updated.push(key);
      etags[key] = etagFromPreferenceRow(row);
    }

    return { namespace, updated, etags };
  }

  async function remove(
    userId: string,
    key: string,
    namespaceInput: string | null | undefined,
    ip?: string,
    ifMatch?: string | null
  ) {
    const namespace = resolveNamespace(namespaceInput);
    assertMutableNamespace(namespace);
    assertValidPreferenceKey(key);
    await enforceWriteRateLimit(userId, ip, "/api/account/preferences/:key");

    const existing = await userPreferencesRepository.get(userId, namespace, key);
    if (!existing) {
      throw new PreferenceNotFoundError();
    }
    assertIfMatchForRow(existing, ifMatch ?? null);

    const deleted = await userPreferencesRepository.delete(userId, namespace, key);
    if (!deleted) {
      throw new PreferenceNotFoundError();
    }

    return { namespace, key, deleted: true as const };
  }

  async function exportAll(userId: string, ip?: string) {
    assertEnabled();
    await enforceReadRateLimit(userId, ip, "/api/account/preferences/export");

    for (const namespace of allowedNamespaces()) {
      await applyDefaultsIfEmpty(userId, namespace);
    }

    const rows = await userPreferencesRepository.listAllForUser(userId);
    const namespaces: Record<string, { entries: Record<string, unknown>; etags: Record<string, string> }> =
      {};

    for (const row of rows) {
      if (!allowedNamespaces().has(row.namespace)) continue;
      if (!namespaces[row.namespace]) {
        namespaces[row.namespace] = { entries: {}, etags: {} };
      }
      namespaces[row.namespace].entries[row.key] = row.value;
      namespaces[row.namespace].etags[row.key] = etagFromPreferenceRow(row);
    }

    return {
      exportedAt: new Date().toISOString(),
      namespaces,
    };
  }

  return {
    isEnabled,
    list,
    get,
    set,
    patch,
    remove,
    exportAll,
  };
}

export type UserPreferencesService = ReturnType<typeof createUserPreferencesService>;
