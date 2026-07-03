/** Reserved namespace for package-owned preference keys. */
export const SECURE_AUTH_PREFERENCES_NAMESPACE = "secure-auth";

/** Documented keys under `secure-auth` (package UI only). */
export const WELL_KNOWN_PREFERENCE_KEYS = {
  colorScheme: "ui.colorScheme",
  sidebarCollapsed: "ui.sidebarCollapsed",
  locale: "ui.locale",
} as const;

export type WellKnownPreferenceKey =
  (typeof WELL_KNOWN_PREFERENCE_KEYS)[keyof typeof WELL_KNOWN_PREFERENCE_KEYS];
