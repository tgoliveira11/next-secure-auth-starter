import { apiClient } from "@/lib/api-client/client.js";

function namespaceQuery(namespace?: string): string {
  if (!namespace) return "";
  return `?namespace=${encodeURIComponent(namespace)}`;
}

export const preferencesApi = {
  list: (namespace?: string) =>
    apiClient.get<{ namespace: string; entries: Record<string, unknown> }>(
      `/api/account/preferences${namespaceQuery(namespace)}`
    ),

  get: (key: string, namespace?: string) =>
    apiClient.get<{ namespace: string; key: string; value: unknown }>(
      `/api/account/preferences/${encodeURIComponent(key)}${namespaceQuery(namespace)}`
    ),

  set: (key: string, value: unknown, namespace?: string) =>
    apiClient.put<{ namespace: string; key: string; value: unknown }>(
      `/api/account/preferences/${encodeURIComponent(key)}${namespaceQuery(namespace)}`,
      { value }
    ),

  patch: (entries: Record<string, unknown>, namespace?: string) =>
    apiClient.patch<{ namespace: string; updated: string[] }>(
      `/api/account/preferences${namespaceQuery(namespace)}`,
      { entries }
    ),

  delete: (key: string, namespace?: string) =>
    apiClient.delete<{ namespace: string; key: string; deleted: true }>(
      `/api/account/preferences/${encodeURIComponent(key)}${namespaceQuery(namespace)}`
    ),
};

export { SECURE_AUTH_PREFERENCES_NAMESPACE, WELL_KNOWN_PREFERENCE_KEYS } from "@/modules/preferences/lib/well-known-keys.js";
