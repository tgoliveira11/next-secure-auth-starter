"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useUiAppSlug } from "@/modules/ui/pages/use-page-ui.js";
import { isFullyAuthenticatedSession } from "@/modules/ui/auth-redirect/session-auth-state.js";
import {
  mergeGuestPreferences,
  type MergeGuestPreferencesOptions,
  type MergeGuestPreferencesResult,
} from "./merge-guest-preferences.js";
import { usePreferencesEnabled } from "./use-user-preferences.js";

export type UseMergeGuestPreferencesOptions = Omit<
  MergeGuestPreferencesOptions,
  "userId" | "namespace"
> & {
  namespace?: string;
  enabled?: boolean;
};

export function useMergeGuestPreferences(options: UseMergeGuestPreferencesOptions) {
  const featureEnabled = usePreferencesEnabled();
  const enabled = featureEnabled && (options.enabled ?? true);
  const defaultNamespace = useUiAppSlug();
  const { status, data: session } = useSession();
  const userId = session?.user?.id;
  const ready = enabled && isFullyAuthenticatedSession(status, session) && Boolean(userId);
  const [result, setResult] = useState<MergeGuestPreferencesResult | null>(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!ready || !userId) return;

    let cancelled = false;
    setMerging(true);
    setError(null);

    void mergeGuestPreferences({
      ...optionsRef.current,
      userId,
      namespace: optionsRef.current.namespace ?? defaultNamespace,
    })
      .then((mergeResult) => {
        if (!cancelled) setResult(mergeResult);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to merge guest preferences");
        }
      })
      .finally(() => {
        if (!cancelled) setMerging(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, userId, defaultNamespace, options.storageKey, options.strategy, options.enabled]);

  return { enabled, ready, merging, result, error };
}
