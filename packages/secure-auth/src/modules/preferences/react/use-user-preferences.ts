"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { preferencesApi } from "@/lib/api-client/preferences.js";
import { useSecureAuthUi } from "@/modules/ui/secure-auth-ui-provider.js";
import { useUiAppSlug } from "@/modules/ui/pages/use-page-ui.js";
import { isFullyAuthenticatedSession } from "@/modules/ui/auth-redirect/session-auth-state.js";

export function usePreferencesEnabled(): boolean {
  return useSecureAuthUi()?.preferences?.enabled === true;
}

export function useUserPreferences(namespace?: string) {
  const enabled = usePreferencesEnabled();
  const defaultNamespace = useUiAppSlug();
  const resolvedNamespace = namespace ?? defaultNamespace;
  const { status, data: session } = useSession();
  const ready = enabled && isFullyAuthenticatedSession(status, session);

  const [entries, setEntries] = useState<Record<string, unknown>>({});
  const [etags, setEtags] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ready) {
      setEntries({});
      setEtags({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await preferencesApi.list(resolvedNamespace);
      setEntries(result.entries);
      setEtags(result.etags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, [ready, resolvedNamespace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setPreference = useCallback(
    async (key: string, value: unknown) => {
      const ifMatch = etags[key];
      const result = await preferencesApi.set(
        key,
        value,
        resolvedNamespace,
        ifMatch ? { ifMatch } : undefined
      );
      setEntries((prev) => ({ ...prev, [key]: result.value }));
      setEtags((prev) => ({ ...prev, [key]: result.etag }));
      return result;
    },
    [etags, resolvedNamespace]
  );

  const patchPreferences = useCallback(
    async (patchEntries: Record<string, unknown>) => {
      const ifMatchEntries = Object.keys(patchEntries).filter((key) => etags[key]);
      const ifMatch =
        ifMatchEntries.length > 0
          ? Object.fromEntries(ifMatchEntries.map((key) => [key, etags[key]]))
          : undefined;
      const result = await preferencesApi.patch(patchEntries, resolvedNamespace, { ifMatch });
      setEntries((prev) => ({ ...prev, ...patchEntries }));
      setEtags((prev) => ({ ...prev, ...result.etags }));
      return result;
    },
    [etags, resolvedNamespace]
  );

  return {
    enabled,
    ready,
    namespace: resolvedNamespace,
    entries,
    etags,
    loading,
    error,
    refresh,
    setPreference,
    patchPreferences,
  };
}

export function useUserPreference<T>(key: string, defaultValue: T, namespace?: string) {
  const {
    enabled,
    ready,
    namespace: resolvedNamespace,
    entries,
    etags,
    loading,
    error,
    refresh,
    setPreference,
  } = useUserPreferences(namespace);

  const value = (entries[key] as T | undefined) ?? defaultValue;

  const setValue = useCallback(
    async (next: T) => {
      await setPreference(key, next);
    },
    [key, setPreference]
  );

  return {
    enabled,
    ready,
    namespace: resolvedNamespace,
    loading,
    error,
    refresh,
    value,
    setValue,
    etag: etags[key],
  };
}
