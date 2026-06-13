/** App-boundary env parsing helpers (not used by @tgoliveira/secure-auth). */

export function readEnv(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const raw = env[key];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function readFirstEnv(env: NodeJS.ProcessEnv, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readEnv(env, key);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function readBooleanEnv(
  env: NodeJS.ProcessEnv,
  keys: string[],
  defaultValue: boolean
): boolean {
  const raw = readFirstEnv(env, keys);
  if (raw === undefined) return defaultValue;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`Invalid boolean environment value "${raw}" (expected "true" or "false")`);
}

export function readNumberEnv(
  env: NodeJS.ProcessEnv,
  keys: string[],
  defaultValue: number,
  options?: { min?: number; max?: number }
): number {
  const raw = readFirstEnv(env, keys);
  if (raw === undefined) return defaultValue;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment value "${raw}"`);
  }
  if (options?.min !== undefined && parsed < options.min) {
    return defaultValue;
  }
  if (options?.max !== undefined && parsed > options.max) {
    return defaultValue;
  }
  return parsed;
}

export function readEnumEnv<T extends string>(
  env: NodeJS.ProcessEnv,
  keys: string[],
  allowed: readonly T[],
  defaultValue: T
): T {
  const raw = readFirstEnv(env, keys);
  if (raw === undefined) return defaultValue;
  if ((allowed as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return defaultValue;
}

export function readOAuthPair(
  env: NodeJS.ProcessEnv,
  clientIdKeys: string[],
  clientSecretKeys: string[]
): { clientId: string; clientSecret: string } | undefined {
  const clientId = readFirstEnv(env, clientIdKeys);
  const clientSecret = readFirstEnv(env, clientSecretKeys);
  if (clientId && clientSecret) {
    return { clientId, clientSecret };
  }
  return undefined;
}
