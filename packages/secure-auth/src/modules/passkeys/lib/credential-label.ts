import type { PasskeyCredentialCapabilityFlags } from "./passkey-capabilities.js";

export type PasskeyCapabilityLabel =
  | "sign-in"
  | "vault-unlock"
  | "sign-in-and-vault-unlock"
  | "non-login";

export function getPasskeyCapabilityLabel(
  flags: Pick<PasskeyCredentialCapabilityFlags, "signInEnabled" | "vaultUnlockEnabled"> = {
    signInEnabled: true,
    vaultUnlockEnabled: false,
  }
): PasskeyCapabilityLabel {
  if (flags.signInEnabled && flags.vaultUnlockEnabled) {
    return "sign-in-and-vault-unlock";
  }
  if (flags.signInEnabled) {
    return "sign-in";
  }
  if (flags.vaultUnlockEnabled) {
    return "vault-unlock";
  }
  return "non-login";
}

export function getPasskeyCapabilityDisplay(
  flags: Pick<PasskeyCredentialCapabilityFlags, "signInEnabled" | "vaultUnlockEnabled"> = {
    signInEnabled: true,
    vaultUnlockEnabled: false,
  }
): string {
  switch (getPasskeyCapabilityLabel(flags)) {
    case "sign-in-and-vault-unlock":
      return "Sign-in + vault unlock";
    case "sign-in":
      return "Sign-in";
    case "vault-unlock":
      return "Vault unlock only";
    case "non-login":
      return "Not used for sign-in";
  }
}
