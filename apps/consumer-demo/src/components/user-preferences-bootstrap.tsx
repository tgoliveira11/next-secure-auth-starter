"use client";

/**
 * CONSUMER-DEMO CUSTOMIZATION
 * Merges guest localStorage UI prefs to the server after login and applies theme.
 */

import { useEffect } from "react";
import {
  useMergeGuestPreferences,
  useUserPreference,
  usePreferencesEnabled,
} from "@tgoliveira/secure-auth/react/client";
import {
  LOCAL_UI_PREFERENCES_KEY,
  applyThemePreference,
  mapLocalUiToPreferenceEntries,
  readLocalUiPreferences,
  writeLocalUiPreferences,
  type LocalUiPreferences,
} from "@/lib/local-ui-preferences";

export function UserPreferencesBootstrap() {
  const enabled = usePreferencesEnabled();
  const { merging } = useMergeGuestPreferences({
    storageKey: LOCAL_UI_PREFERENCES_KEY,
    mapLocalToEntries: mapLocalUiToPreferenceEntries,
  });
  const { value: theme, ready } = useUserPreference<string>("theme", "system");

  useEffect(() => {
    if (!enabled || !ready || merging) return;
    applyThemePreference(theme);
  }, [enabled, ready, merging, theme]);

  return null;
}

export function useGuestOrSyncedTheme() {
  const enabled = usePreferencesEnabled();
  const { value: serverTheme, setValue: setServerTheme, ready } = useUserPreference<string>(
    "theme",
    "system"
  );

  if (!enabled) {
    return {
      theme: readLocalUiPreferences().theme ?? "system",
      setTheme: (next: LocalUiPreferences["theme"]) => {
        writeLocalUiPreferences({ ...readLocalUiPreferences(), theme: next });
        applyThemePreference(next);
      },
      ready: true,
    };
  }

  return {
    theme: ready ? serverTheme : readLocalUiPreferences().theme ?? "system",
    setTheme: async (next: LocalUiPreferences["theme"]) => {
      writeLocalUiPreferences({ ...readLocalUiPreferences(), theme: next });
      applyThemePreference(next);
      if (ready) {
        await setServerTheme(next ?? "system");
      }
    },
    ready,
  };
}
