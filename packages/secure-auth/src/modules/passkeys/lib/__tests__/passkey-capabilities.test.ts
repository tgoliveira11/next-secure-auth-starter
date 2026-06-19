import { describe, it, expect } from "vitest";
import {
  assertRemovableFromAccountSettings,
  getPasskeyAccountBadge,
  getPasskeyAccountDescription,
  getPasskeyAccountLabel,
  isRemovableFromAccountSettings,
  toAccountPasskeyListItem,
  toSignInExcludeCredentials,
} from "../passkey-capabilities";
import { PasskeyAccountBoundaryError } from "../../services/passkey-service";

describe("passkey capabilities", () => {
  it("marks sign-in-only credentials as removable", () => {
    expect(isRemovableFromAccountSettings({ signInEnabled: true, vaultUnlockEnabled: false })).toBe(
      true
    );
  });

  it("marks vault-only credentials as not removable", () => {
    expect(
      isRemovableFromAccountSettings({ signInEnabled: false, vaultUnlockEnabled: true })
    ).toBe(false);
    expect(getPasskeyAccountBadge({ signInEnabled: false, vaultUnlockEnabled: true })).toBe(
      "Vault unlock only"
    );
    expect(getPasskeyAccountDescription({ signInEnabled: false, vaultUnlockEnabled: true })).toContain(
      "Vault settings"
    );
  });

  it("marks dual-capability credentials as not removable", () => {
    expect(isRemovableFromAccountSettings({ signInEnabled: true, vaultUnlockEnabled: true })).toBe(
      false
    );
    expect(getPasskeyAccountBadge({ signInEnabled: true, vaultUnlockEnabled: true })).toBe(
      "Sign-in + vault unlock"
    );
  });

  it("marks unknown non-login credentials as not removable", () => {
    expect(isRemovableFromAccountSettings({ signInEnabled: false, vaultUnlockEnabled: false })).toBe(
      false
    );
    expect(getPasskeyAccountBadge({ signInEnabled: false, vaultUnlockEnabled: false })).toBe(
      "Not used for sign-in"
    );
  });

  it("builds account list metadata for vault-only credentials", () => {
    const item = toAccountPasskeyListItem(
      {
        id: "pk-vault",
        friendlyName: "Vault passkey",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        lastUsedAt: null,
        signInEnabled: false,
        vaultUnlockEnabled: true,
      },
      "Passkey"
    );

    expect(item.removableFromAccountSettings).toBe(false);
    expect(item.capabilities).toEqual({ signIn: false, vaultUnlock: true });
    expect(item.label).toBe("Vault passkey");
    expect(item.description).not.toContain("Sign in without a password");
  });

  it("rejects account removal for non-auth credentials", () => {
    expect(() =>
      assertRemovableFromAccountSettings({ signInEnabled: false, vaultUnlockEnabled: true })
    ).toThrow(PasskeyAccountBoundaryError);
    expect(() =>
      assertRemovableFromAccountSettings({ signInEnabled: true, vaultUnlockEnabled: true })
    ).toThrow(/another security feature/);
  });

  it("defaults vault-only label when friendly name is missing", () => {
    expect(
      getPasskeyAccountLabel(
        { signInEnabled: false, vaultUnlockEnabled: true, friendlyName: null },
        "Passkey"
      )
    ).toBe("Vault passkey");
  });

  describe("toSignInExcludeCredentials", () => {
    it("includes sign-in-only credentials", () => {
      const result = toSignInExcludeCredentials([
        { credentialId: "auth-1", signInEnabled: true, transports: ["internal"] },
      ]);
      expect(result).toEqual([{ id: "auth-1", transports: ["internal"] }]);
    });

    it("excludes vault-only credentials", () => {
      const result = toSignInExcludeCredentials([
        { credentialId: "vault-1", signInEnabled: false, transports: ["internal"] },
      ]);
      expect(result).toEqual([]);
    });

    it("includes only sign-in credentials from a mixed list", () => {
      const result = toSignInExcludeCredentials([
        { credentialId: "auth-1", signInEnabled: true },
        { credentialId: "vault-1", signInEnabled: false },
      ]);
      expect(result.map((c) => c.id)).toEqual(["auth-1"]);
    });

    it("includes dual-capability credentials", () => {
      const result = toSignInExcludeCredentials([
        { credentialId: "dual-1", signInEnabled: true },
      ]);
      expect(result).toEqual([{ id: "dual-1", transports: undefined }]);
    });
  });
});
