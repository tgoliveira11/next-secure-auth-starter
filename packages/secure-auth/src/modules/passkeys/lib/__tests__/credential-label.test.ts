import { describe, it, expect } from "vitest";
import {
  getPasskeyCapabilityDisplay,
  getPasskeyCapabilityLabel,
} from "../credential-label";

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

  it("describes dual capability", () => {
    expect(getPasskeyCapabilityLabel({ signInEnabled: true, vaultUnlockEnabled: true })).toBe(
      "sign-in-and-vault-unlock"
    );
  });

  it("defaults to sign-in labels for legacy callers", () => {
    expect(getPasskeyCapabilityLabel()).toBe("sign-in");
    expect(getPasskeyCapabilityDisplay()).toBe("Sign-in");
  });
});
