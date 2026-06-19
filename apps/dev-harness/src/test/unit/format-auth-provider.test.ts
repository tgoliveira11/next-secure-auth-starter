import { describe, it, expect } from "vitest";
import { formatAuthProvider } from "@tgoliveira/secure-auth/client";

describe("formatAuthProvider", () => {
  it("maps known providers to friendly labels", () => {
    expect(formatAuthProvider("credentials")).toBe("Email and password");
    expect(formatAuthProvider("google")).toBe("Google");
    expect(formatAuthProvider("apple")).toBe("Apple");
    expect(formatAuthProvider("azure-ad")).toBe("Microsoft");
    expect(formatAuthProvider("github")).toBe("GitHub");
  });

  it("returns the raw provider id for unknown values", () => {
    expect(formatAuthProvider("custom-provider")).toBe("custom-provider");
  });
});
