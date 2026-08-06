import { describe, expect, it } from "vitest";
import { requiresTotpAfterLogin, type AccountLoginMethod } from "../totp-login";

describe("requiresTotpAfterLogin", () => {
  it.each<AccountLoginMethod>(["credentials", "passkey", "oauth"])(
    "requires TOTP after %s when account 2FA is enabled",
    (method) => {
      expect(requiresTotpAfterLogin(method, true)).toBe(true);
      expect(requiresTotpAfterLogin(method, false)).toBe(false);
    }
  );
});
