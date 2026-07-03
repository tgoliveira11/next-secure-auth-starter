import { describe, it, expect } from "vitest";
import {
  assertJsonSerializable,
  assertValidNamespace,
  assertValidPreferenceKey,
  assertWithinValueSizeLimit,
  measureJsonValueBytes,
  PreferenceValidationError,
} from "@/modules/preferences/lib/preference-limits.js";

describe("preference-limits", () => {
  it("accepts valid namespace and key patterns", () => {
    expect(() => assertValidNamespace("my-app")).not.toThrow();
    expect(() => assertValidPreferenceKey("theme.v2")).not.toThrow();
  });

  it("rejects invalid namespace and key patterns", () => {
    expect(() => assertValidNamespace("-bad")).toThrow(PreferenceValidationError);
    expect(() => assertValidPreferenceKey("")).toThrow(PreferenceValidationError);
  });

  it("rejects undefined and non-serializable values", () => {
    expect(() => assertJsonSerializable(undefined)).toThrow(PreferenceValidationError);
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(() => assertJsonSerializable(circular)).toThrow(PreferenceValidationError);
  });

  it("measures JSON byte size and enforces limit", () => {
    const value = { theme: "dark" };
    expect(measureJsonValueBytes(value)).toBeGreaterThan(0);
    expect(() => assertWithinValueSizeLimit(value, 4096)).not.toThrow();
    expect(() => assertWithinValueSizeLimit(value, 1)).toThrow(PreferenceValidationError);
  });
});
