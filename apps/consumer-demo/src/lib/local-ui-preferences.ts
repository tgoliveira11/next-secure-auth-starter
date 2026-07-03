/**
 * CONSUMER-DEMO CUSTOMIZATION
 * Local (guest) UI preferences stored before sign-in.
 * Merged to the server after login via useMergeGuestPreferences.
 */

export const LOCAL_UI_PREFERENCES_KEY = "consumer-demo:ui-preferences";

export type LocalUiPreferences = {
  theme?: "light" | "dark" | "system";
  sidebarCollapsed?: boolean;
};

export function readLocalUiPreferences(): LocalUiPreferences {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_UI_PREFERENCES_KEY);
    return raw ? (JSON.parse(raw) as LocalUiPreferences) : {};
  } catch {
    return {};
  }
}

export function writeLocalUiPreferences(prefs: LocalUiPreferences): void {
  window.localStorage.setItem(LOCAL_UI_PREFERENCES_KEY, JSON.stringify(prefs));
}

export function mapLocalUiToPreferenceEntries(local: unknown): Record<string, unknown> {
  const prefs = (local ?? {}) as LocalUiPreferences;
  const entries: Record<string, unknown> = {};
  if (prefs.theme) entries.theme = prefs.theme;
  if (typeof prefs.sidebarCollapsed === "boolean") {
    entries["layout.sidebarCollapsed"] = prefs.sidebarCollapsed;
  }
  return entries;
}

export function applyThemePreference(theme: string | undefined): void {
  const root = document.documentElement;
  if (!theme || theme === "system") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
}
