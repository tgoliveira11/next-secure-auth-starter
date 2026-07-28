export type WebAuthnResponseWithClientExtensionResults = {
  clientExtensionResults?: unknown;
};

export type SecureAuthServerWebAuthnResponse<
  T extends WebAuthnResponseWithClientExtensionResults,
> = Omit<T, "clientExtensionResults"> & {
  clientExtensionResults: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const MAX_SENSITIVE_SCAN_DEPTH = 12;
const MAX_SENSITIVE_SCAN_NODES = 2048;
const SENSITIVE_PRF_KEYS = new Set([
  "prf",
  "prfoutput",
  "prfoutputs",
  "prfhash",
  "prfresult",
  "prfresults",
  "prfsecret",
  "prfvalue",
]);

function normalizeSensitiveKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, "");
}

function isSensitivePrfKey(key: string): boolean {
  return SENSITIVE_PRF_KEYS.has(normalizeSensitiveKey(key));
}

function containsSensitiveValue(
  value: unknown,
  depth: number,
  state: { nodes: number; seen: WeakSet<object> }
): boolean {
  if (!value || typeof value !== "object") return false;
  if (depth > MAX_SENSITIVE_SCAN_DEPTH || ++state.nodes > MAX_SENSITIVE_SCAN_NODES) return true;
  if (state.seen.has(value)) return true;
  state.seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    if (isSensitivePrfKey(key) || containsSensitiveValue(child, depth + 1, state)) return true;
  }
  return false;
}

/** Bounded, recursive server-boundary inspection for documented PRF-derived field names. */
export function containsSensitivePrfMaterial(value: unknown): boolean {
  return containsSensitiveValue(value, 0, { nodes: 0, seen: new WeakSet() });
}

function sanitizeSensitiveValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>
): unknown {
  if (!value || typeof value !== "object") return value;
  if (depth > MAX_SENSITIVE_SCAN_DEPTH || seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitiveValue(item, depth + 1, seen));
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSensitivePrfKey(key))
      .map(([key, child]) => [key, sanitizeSensitiveValue(child, depth + 1, seen)])
  );
}

/**
 * Returns a non-mutating response copy without PRF client-extension results.
 *
 * PRF results can contain vault key material and must remain browser-only. Secure-auth never needs
 * them to verify account registration or authentication. Other extension results are preserved.
 */
export function sanitizeWebAuthnResponseForSecureAuthServer<
  T extends object,
>(
  response: T & WebAuthnResponseWithClientExtensionResults
): SecureAuthServerWebAuthnResponse<T & WebAuthnResponseWithClientExtensionResults> {
  if (!isRecord(response)) {
    throw new TypeError("WebAuthn response must be an object");
  }

  const extensionResults = isRecord(response.clientExtensionResults)
    ? sanitizeSensitiveValue(response.clientExtensionResults, 0, new WeakSet())
    : {};

  return {
    ...response,
    clientExtensionResults: extensionResults,
  } as SecureAuthServerWebAuthnResponse<T & WebAuthnResponseWithClientExtensionResults>;
}

/** Server boundary guard. Presence is rejected even when the PRF value is null or empty. */
export function hasPrfClientExtensionResult(response: unknown): boolean {
  return containsSensitivePrfMaterial(response);
}

function zeroBufferSources(value: unknown, seen: WeakSet<object>): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  try {
    if (value instanceof ArrayBuffer) {
      new Uint8Array(value).fill(0);
      return;
    }
    if (ArrayBuffer.isView(value)) {
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength).fill(0);
      return;
    }
    for (const child of Object.values(value)) zeroBufferSources(child, seen);
  } catch {
    // Best effort: cleanup must never mask the ceremony result or its original failure.
  }
}

function releaseSensitiveFields(
  value: unknown,
  depth: number,
  seen: WeakSet<object>
): void {
  if (!value || typeof value !== "object") return;
  if (depth > MAX_SENSITIVE_SCAN_DEPTH || seen.has(value)) return;
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      for (const child of value) releaseSensitiveFields(child, depth + 1, seen);
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (isSensitivePrfKey(key)) {
        zeroBufferSources(child, new WeakSet());
        Reflect.deleteProperty(value, key);
      } else {
        releaseSensitiveFields(child, depth + 1, seen);
      }
    }
  } catch {
    // Best effort: hostile or immutable extension objects must not replace the original outcome.
  }
}

/** Best-effort release after browser-only hooks complete; copies remain consumer-owned. */
export function releaseSensitiveClientExtensionResults(
  response: WebAuthnResponseWithClientExtensionResults
): void {
  try {
    releaseSensitiveFields(response.clientExtensionResults, 0, new WeakSet());
  } catch {
    // Keep this helper safe to call from a ceremony-wide finally block.
  }
}
