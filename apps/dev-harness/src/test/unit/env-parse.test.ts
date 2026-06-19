import { describe, it, expect } from "vitest";
import {
  readBooleanEnv,
  readEnumEnv,
  readEnv,
  readFirstEnv,
  readNumberEnv,
  readOAuthPair,
} from "@/lib/env/parse";

describe("env parse helpers", () => {
  it("readEnv trims and treats empty as undefined", () => {
    expect(readEnv({ FOO: "  bar  " }, "FOO")).toBe("bar");
    expect(readEnv({ FOO: "" }, "FOO")).toBeUndefined();
    expect(readEnv({ FOO: "   " }, "FOO")).toBeUndefined();
  });

  it("readFirstEnv returns first defined key", () => {
    expect(readFirstEnv({ A: "1", B: "2" }, ["B", "A"])).toBe("2");
    expect(readFirstEnv({}, ["A", "B"])).toBeUndefined();
  });

  it("readBooleanEnv parses true and false", () => {
    expect(readBooleanEnv({ X: "true" }, ["X"], false)).toBe(true);
    expect(readBooleanEnv({ X: "false" }, ["X"], true)).toBe(false);
    expect(readBooleanEnv({}, ["X"], true)).toBe(true);
  });

  it("readBooleanEnv throws on invalid values", () => {
    expect(() => readBooleanEnv({ X: "yes" }, ["X"], false)).toThrow(/Invalid boolean/);
  });

  it("readNumberEnv parses numbers and uses defaults", () => {
    expect(readNumberEnv({ N: "42" }, ["N"], 10)).toBe(42);
    expect(readNumberEnv({}, ["N"], 10)).toBe(10);
    expect(readNumberEnv({ N: "5" }, ["N"], 10, { min: 8 })).toBe(10);
    expect(readNumberEnv({ N: "999" }, ["N"], 10, { max: 100 })).toBe(10);
  });

  it("readNumberEnv throws on non-numeric values", () => {
    expect(() => readNumberEnv({ N: "abc" }, ["N"], 10)).toThrow(/Invalid numeric/);
  });

  it("readEnumEnv validates allowed values", () => {
    const allowed = ["above", "below"] as const;
    expect(readEnumEnv({ P: "below" }, ["P"], allowed, "above")).toBe("below");
    expect(readEnumEnv({}, ["P"], allowed, "above")).toBe("above");
    expect(readEnumEnv({ P: "side" }, ["P"], allowed, "above")).toBe("above");
  });

  it("readOAuthPair requires both id and secret", () => {
    expect(
      readOAuthPair(
        { ID: "id", SECRET: "secret" },
        ["ID"],
        ["SECRET"]
      )
    ).toEqual({ clientId: "id", clientSecret: "secret" });
    expect(readOAuthPair({ ID: "id" }, ["ID"], ["SECRET"])).toBeUndefined();
  });
});
