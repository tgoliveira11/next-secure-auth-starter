export type PasskeyCapabilities = {
  signIn: boolean;
  vaultUnlock: boolean;
};

export type PasskeyCredentialCapabilityFlags = {
  signInEnabled: boolean;
  vaultUnlockEnabled: boolean;
  friendlyName?: string | null;
};

export type AccountPasskeyListItem = {
  id: string;
  friendlyName: string;
  createdAt: string;
  lastUsedAt: string | null;
  signInEnabled: boolean;
  vaultUnlockEnabled: boolean;
  capabilities: PasskeyCapabilities;
  removableFromAccountSettings: boolean;
  label: string;
  description: string;
  badge: string | null;
};

const ACCOUNT_BOUNDARY_MESSAGE =
  "This passkey is not managed from account security settings.";
const FEATURE_BOUNDARY_MESSAGE =
  "This passkey is used by another security feature. Manage it from the relevant settings page.";

/** Raised when account passkey management boundaries block an operation (maps to HTTP 409). */
export class PasskeyAccountBoundaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export type PasskeyExcludeCredentialInput = {
  credentialId: string;
  signInEnabled: boolean;
  transports?: unknown;
};

/** WebAuthn exclude list for account sign-in registration — sign-in credentials only. */
export function toSignInExcludeCredentials(
  credentials: PasskeyExcludeCredentialInput[]
): { id: string; transports?: AuthenticatorTransport[] }[] {
  return credentials
    .filter((c) => c.signInEnabled)
    .map((c) => ({
      id: c.credentialId,
      transports: (c.transports as AuthenticatorTransport[]) ?? undefined,
    }));
}

export function resolvePasskeyCapabilities(
  flags: Pick<PasskeyCredentialCapabilityFlags, "signInEnabled" | "vaultUnlockEnabled">
): PasskeyCapabilities {
  return {
    signIn: flags.signInEnabled,
    vaultUnlock: flags.vaultUnlockEnabled,
  };
}

/** Account settings may revoke only pure account sign-in credentials. */
export function isRemovableFromAccountSettings(
  flags: Pick<PasskeyCredentialCapabilityFlags, "signInEnabled" | "vaultUnlockEnabled">
): boolean {
  return flags.signInEnabled && !flags.vaultUnlockEnabled;
}

export function assertRemovableFromAccountSettings(
  flags: Pick<PasskeyCredentialCapabilityFlags, "signInEnabled" | "vaultUnlockEnabled">
): void {
  if (!flags.signInEnabled) {
    throw new PasskeyAccountBoundaryError(ACCOUNT_BOUNDARY_MESSAGE);
  }
  if (flags.vaultUnlockEnabled) {
    throw new PasskeyAccountBoundaryError(FEATURE_BOUNDARY_MESSAGE);
  }
}

export function getPasskeyAccountBadge(
  flags: Pick<PasskeyCredentialCapabilityFlags, "signInEnabled" | "vaultUnlockEnabled">
): string | null {
  if (flags.signInEnabled && flags.vaultUnlockEnabled) {
    return "Sign-in + vault unlock";
  }
  if (flags.signInEnabled) {
    return "Sign-in";
  }
  if (flags.vaultUnlockEnabled) {
    return "Vault unlock only";
  }
  return "Not used for sign-in";
}

export function getPasskeyAccountDescription(
  flags: Pick<PasskeyCredentialCapabilityFlags, "signInEnabled" | "vaultUnlockEnabled">
): string {
  if (flags.signInEnabled && flags.vaultUnlockEnabled) {
    return "This passkey is used for account sign-in and vault unlock. Disable vault unlock before removing it from account settings.";
  }
  if (flags.signInEnabled) {
    return "Sign in without a password using this passkey.";
  }
  if (flags.vaultUnlockEnabled) {
    return "This passkey is used for vault unlock and cannot be removed from account security settings. Manage it from Vault settings.";
  }
  return "This credential is not enabled for account sign-in.";
}

export function getPasskeyAccountLabel(
  flags: PasskeyCredentialCapabilityFlags,
  fallbackName: string
): string {
  if (!flags.signInEnabled && flags.vaultUnlockEnabled && !flags.friendlyName) {
    return "Vault passkey";
  }
  return flags.friendlyName?.trim() || fallbackName;
}

export function toAccountPasskeyListItem(
  cred: {
    id: string;
    friendlyName: string | null;
    createdAt: Date;
    lastUsedAt: Date | null;
    signInEnabled: boolean;
    vaultUnlockEnabled: boolean;
  },
  fallbackName: string
): AccountPasskeyListItem {
  const flags = {
    signInEnabled: cred.signInEnabled,
    vaultUnlockEnabled: cred.vaultUnlockEnabled,
    friendlyName: cred.friendlyName,
  };

  return {
    id: cred.id,
    friendlyName: getPasskeyAccountLabel(flags, fallbackName),
    createdAt: cred.createdAt.toISOString(),
    lastUsedAt: cred.lastUsedAt?.toISOString() ?? null,
    signInEnabled: cred.signInEnabled,
    vaultUnlockEnabled: cred.vaultUnlockEnabled,
    capabilities: resolvePasskeyCapabilities(flags),
    removableFromAccountSettings: isRemovableFromAccountSettings(flags),
    label: getPasskeyAccountLabel(flags, fallbackName),
    description: getPasskeyAccountDescription(flags),
    badge: getPasskeyAccountBadge(flags),
  };
}
