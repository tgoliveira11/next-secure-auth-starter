import { describe, it, expect } from "vitest";
import {
  readBooleanEnv,
  readEnumEnv,
  readNumberEnv,
} from "@/lib/env/parse";

describe("env parse helpers", () => {
  it("readBooleanEnv parses and throws on invalid", () => {
    expect(readBooleanEnv({ X: "true" }, ["X"], false)).toBe(true);
    expect(() => readBooleanEnv({ X: "1" }, ["X"], false)).toThrow();
  });

  it("readEnumEnv falls back on invalid", () => {
    const allowed = ["above", "below"] as const;
    expect(readEnumEnv({ P: "invalid" }, ["P"], allowed, "above")).toBe("above");
  });

  it("readNumberEnv falls back when below min", () => {
    expect(readNumberEnv({ N: "1" }, ["N"], 300, { min: 30 })).toBe(300);
  });
});
