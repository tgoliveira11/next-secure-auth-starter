import { apiClient } from "@/lib/api-client/client.js";

function namespaceQuery(namespace?: string): string {
  if (!namespace) return "";
  return `?namespace=${encodeURIComponent(namespace)}`;
}

export type PreferencesListResponse = {
  namespace: string;
  entries: Record<string, unknown>;
  etags: Record<string, string>;
};

export type PreferenceItemResponse = {
  namespace: string;
  key: string;
  value: unknown;
  etag: string;
};

export type PreferencesPatchResponse = {
  namespace: string;
  updated: string[];
  etags: Record<string, string>;
};

export type PreferencesExportResponse = {
  exportedAt: string;
  namespaces: Record<
    string,
    {
      entries: Record<string, unknown>;
      etags: Record<string, string>;
    }
  >;
};

export type PreferencesWriteOptions = {
  ifMatch?: string;
};

export type PreferencesPatchOptions = {
  ifMatch?: Record<string, string>;
};

export const preferencesApi = {
  list: (namespace?: string) =>
    apiClient.get<PreferencesListResponse>(
      `/api/account/preferences${namespaceQuery(namespace)}`
    ),

  get: (key: string, namespace?: string) =>
    apiClient.get<PreferenceItemResponse>(
      `/api/account/preferences/${encodeURIComponent(key)}${namespaceQuery(namespace)}`
    ),

  set: (key: string, value: unknown, namespace?: string, options?: PreferencesWriteOptions) =>
    apiClient.put<PreferenceItemResponse>(
      `/api/account/preferences/${encodeURIComponent(key)}${namespaceQuery(namespace)}`,
      { value },
      options?.ifMatch ? { headers: { "If-Match": options.ifMatch } } : undefined
    ),

  patch: (
    entries: Record<string, unknown>,
    namespace?: string,
    options?: PreferencesPatchOptions
  ) =>
    apiClient.patch<PreferencesPatchResponse>(
      `/api/account/preferences${namespaceQuery(namespace)}`,
      {
        entries,
        ...(options?.ifMatch ? { ifMatch: options.ifMatch } : {}),
      }
    ),

  delete: (key: string, namespace?: string, options?: PreferencesWriteOptions) =>
    apiClient.delete<{ namespace: string; key: string; deleted: true }>(
      `/api/account/preferences/${encodeURIComponent(key)}${namespaceQuery(namespace)}`,
      undefined,
      options?.ifMatch ? { headers: { "If-Match": options.ifMatch } } : undefined
    ),

  exportAll: () => apiClient.get<PreferencesExportResponse>("/api/account/preferences/export"),
};

export { SECURE_AUTH_PREFERENCES_NAMESPACE, WELL_KNOWN_PREFERENCE_KEYS } from "@/modules/preferences/lib/well-known-keys.js";
