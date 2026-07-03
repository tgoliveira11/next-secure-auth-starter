"use client";

import { preferencesApi } from "@/lib/api-client/preferences.js";

export type MergeGuestPreferencesStrategy =
  | "local-wins-if-server-empty"
  | "local-wins-once"
  | "server-wins";

export type MergeGuestPreferencesOptions = {
  userId: string;
  storageKey: string;
  readLocal?: () => unknown;
  mapLocalToEntries: (local: unknown) => Record<string, unknown>;
  namespace?: string;
  keys?: string[];
  strategy?: MergeGuestPreferencesStrategy;
  idempotencyStorage?: Storage | null;
};

export type MergeGuestPreferencesResult = {
  merged: string[];
  skipped: string[];
  reason?: "already-merged" | "no-local-data" | "server-wins";
};

const MERGE_FLAG_PREFIX = "secure-auth:prefs-merged:";

export function buildPreferencesMergeStorageKey(userId: string): string {
  return `${MERGE_FLAG_PREFIX}${userId}`;
}

function defaultReadLocal(storageKey: string): unknown {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function mergeGuestPreferences(
  options: MergeGuestPreferencesOptions
): Promise<MergeGuestPreferencesResult> {
  const {
    userId,
    storageKey,
    readLocal,
    mapLocalToEntries,
    namespace,
    keys,
    strategy = "local-wins-if-server-empty",
    idempotencyStorage = typeof window !== "undefined" ? window.sessionStorage : null,
  } = options;

  const flagKey = buildPreferencesMergeStorageKey(userId);
  if (idempotencyStorage?.getItem(flagKey) === "1") {
    return { merged: [], skipped: [], reason: "already-merged" };
  }

  if (strategy === "server-wins") {
    idempotencyStorage?.setItem(flagKey, "1");
    return { merged: [], skipped: [], reason: "server-wins" };
  }

  const local = readLocal ? readLocal() : defaultReadLocal(storageKey);
  if (local === null || local === undefined) {
    idempotencyStorage?.setItem(flagKey, "1");
    return { merged: [], skipped: [], reason: "no-local-data" };
  }

  const mapped = mapLocalToEntries(local);
  const candidateKeys = keys ?? Object.keys(mapped);
  if (candidateKeys.length === 0) {
    idempotencyStorage?.setItem(flagKey, "1");
    return { merged: [], skipped: [], reason: "no-local-data" };
  }

  const server = await preferencesApi.list(namespace);
  const toMerge: Record<string, unknown> = {};
  const merged: string[] = [];
  const skipped: string[] = [];

  for (const key of candidateKeys) {
    if (!(key in mapped)) continue;
    const serverHasKey = key in server.entries;
    if (strategy === "local-wins-once") {
      toMerge[key] = mapped[key];
      merged.push(key);
    } else if (!serverHasKey) {
      toMerge[key] = mapped[key];
      merged.push(key);
    } else {
      skipped.push(key);
    }
  }

  if (Object.keys(toMerge).length > 0) {
    await preferencesApi.patch(toMerge, namespace);
  }

  idempotencyStorage?.setItem(flagKey, "1");
  return { merged, skipped };
}
