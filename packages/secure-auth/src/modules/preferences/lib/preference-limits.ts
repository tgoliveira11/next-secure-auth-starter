export const DEFAULT_MAX_KEYS_PER_USER = 50;
export const DEFAULT_MAX_VALUE_BYTES = 4096;

const NAMESPACE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

export class PreferenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreferenceValidationError";
  }
}

export function resolvePreferenceLimits(config: {
  preferences?: {
    maxKeysPerUser?: number;
    maxValueBytes?: number;
  };
}) {
  return {
    maxKeysPerUser: config.preferences?.maxKeysPerUser ?? DEFAULT_MAX_KEYS_PER_USER,
    maxValueBytes: config.preferences?.maxValueBytes ?? DEFAULT_MAX_VALUE_BYTES,
  };
}

export function assertValidNamespace(namespace: string): void {
  if (!NAMESPACE_PATTERN.test(namespace)) {
    throw new PreferenceValidationError("Invalid namespace");
  }
}

export function assertValidPreferenceKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new PreferenceValidationError("Invalid preference key");
  }
}

export function assertJsonSerializable(value: unknown): void {
  if (value === undefined) {
    throw new PreferenceValidationError("Preference value must not be undefined");
  }

  try {
    JSON.stringify(value);
  } catch {
    throw new PreferenceValidationError("Preference value must be JSON-serializable");
  }
}

export function measureJsonValueBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export function assertWithinValueSizeLimit(value: unknown, maxValueBytes: number): void {
  assertJsonSerializable(value);
  const bytes = measureJsonValueBytes(value);
  if (bytes > maxValueBytes) {
    throw new PreferenceValidationError("Preference value exceeds size limit");
  }
}
