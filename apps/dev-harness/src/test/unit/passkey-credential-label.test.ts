import { describe, it, expect } from "vitest";
import {
  getPasskeyCapabilityDisplay,
  getPasskeyCapabilityLabel,
} from "@tgoliveira/secure-auth/client";

describe("passkey credential labels", () => {
  it("describes account sign-in capability", () => {
    expect(getPasskeyCapabilityLabel({ signInEnabled: true, vaultUnlockEnabled: false })).toBe(
      "sign-in"
    );
    expect(getPasskeyCapabilityDisplay({ signInEnabled: true, vaultUnlockEnabled: false })).toBe(
      "Sign-in"
    );
  });

  it("describes vault unlock only capability", () => {
    expect(getPasskeyCapabilityLabel({ signInEnabled: false, vaultUnlockEnabled: true })).toBe(
      "vault-unlock"
    );
    expect(getPasskeyCapabilityDisplay({ signInEnabled: false, vaultUnlockEnabled: true })).toBe(
      "Vault unlock only"
    );
  });
});
