import { ApiError } from "./api-error";
import { getErrorMessage, parseJsonResponse } from "./parse-response";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new ApiError(res.status, await getErrorMessage(res, res.statusText));
  }

  if (res.status === 204) return undefined as T;
  const data = await parseJsonResponse<T>(res);
  if (data === null) {
    throw new ApiError(res.status, "Empty response from server");
  }
  return data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), ...init }),
  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), ...init }),
  delete: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      method: "DELETE",
      ...init,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
};