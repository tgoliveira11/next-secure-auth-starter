import { describe, it, expect } from "vitest";
import {
  getPasskeyLoginHint,
  setPasskeyLoginHint,
  clearPasskeyLoginHint,
} from "@/lib/passkey/login-hint";

describe("passkey login hint (server)", () => {
  it("no-ops when browser APIs are unavailable", () => {
    expect(getPasskeyLoginHint()).toBeNull();
    expect(() => setPasskeyLoginHint({ userId: "user-id" })).not.toThrow();
    expect(() => clearPasskeyLoginHint()).not.toThrow();
  });
});
