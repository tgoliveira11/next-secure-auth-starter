import type {
  PasskeyLoginAuthenticationExtensions,
  SecureAuthConfig,
  SecureAuthJsonValue,
} from "@/core/types";

const MAX_EXTENSION_DEPTH = 8;
const MAX_EXTENSION_NODES = 256;
const MAX_EXTENSION_JSON_BYTES = 16_384;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function cloneJsonValue(
  value: unknown,
  depth: number,
  state: { nodes: number; seen: WeakSet<object> }
): SecureAuthJsonValue {
  state.nodes += 1;
  if (state.nodes > MAX_EXTENSION_NODES || depth > MAX_EXTENSION_DEPTH) {
    throw new TypeError("Passkey login authentication extensions exceed the allowed complexity.");
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Passkey login authentication extensions must contain finite numbers.");
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError("Passkey login authentication extensions must be JSON-safe.");
  }
  if (state.seen.has(value)) {
    throw new TypeError("Passkey login authentication extensions must not contain cycles.");
  }
  state.seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((item) => cloneJsonValue(item, depth + 1, state));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Passkey login authentication extensions must use plain objects.");
    }

    const clone: Record<string, SecureAuthJsonValue> = Object.create(null);
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_OBJECT_KEYS.has(key)) {
        throw new TypeError("Passkey login authentication extensions contain a forbidden key.");
      }
      clone[key] = cloneJsonValue(child, depth + 1, state);
    }
    return clone;
  } finally {
    state.seen.delete(value);
  }
}

export async function resolveLoginAuthenticationExtensions(input: {
  config: SecureAuthConfig;
  userId?: string;
  allowCredentials?: readonly { id: string }[];
}): Promise<PasskeyLoginAuthenticationExtensions | undefined> {
  const callback = input.config.webauthn?.getLoginAuthenticationExtensions;
  if (!callback || !input.userId || !input.allowCredentials?.length) return undefined;

  const credentialIds = Object.freeze(input.allowCredentials.map(({ id }) => id));
  const result = await callback(Object.freeze({ userId: input.userId, credentialIds }));
  if (result === undefined) return undefined;

  const cloned = cloneJsonValue(result, 0, {
    nodes: 0,
    seen: new WeakSet(),
  });
  if (Array.isArray(cloned) || cloned === null || typeof cloned !== "object") {
    throw new TypeError("Passkey login authentication extensions must be an object.");
  }

  const serialized = JSON.stringify(cloned);
  if (new TextEncoder().encode(serialized).byteLength > MAX_EXTENSION_JSON_BYTES) {
    throw new TypeError("Passkey login authentication extensions exceed the allowed size.");
  }

  return cloned;
}
