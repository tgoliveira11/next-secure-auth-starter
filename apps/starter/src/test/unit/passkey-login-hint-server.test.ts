/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import {
  getPasskeyLoginHint,
  setPasskeyLoginHint,
  clearPasskeyLoginHint,
} from "@tgoliveira/secure-auth/client";
import { APP_SLUG } from "@/lib/brand";

describe("passkey login hint (server)", () => {
  it("returns null and no-ops safely without browser APIs", () => {
    expect(getPasskeyLoginHint(APP_SLUG)).toBeNull();
    expect(() => setPasskeyLoginHint(APP_SLUG, { userId: "user-id" })).not.toThrow();
    expect(() => clearPasskeyLoginHint(APP_SLUG)).not.toThrow();
  });
});
