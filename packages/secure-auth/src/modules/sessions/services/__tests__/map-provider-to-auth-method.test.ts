import { describe, it, expect } from "vitest";
import { mapProviderToAuthMethod } from "../account-session-service";

describe("mapProviderToAuthMethod", () => {
  it("maps github provider id to github auth method", () => {
    expect(mapProviderToAuthMethod("github")).toBe("github");
  });

  it("maps other known OAuth providers", () => {
    expect(mapProviderToAuthMethod("google")).toBe("google");
    expect(mapProviderToAuthMethod("apple")).toBe("apple");
    expect(mapProviderToAuthMethod("azure-ad")).toBe("microsoft");
  });
});
