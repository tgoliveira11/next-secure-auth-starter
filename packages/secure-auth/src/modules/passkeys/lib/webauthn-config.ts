import { getSecureAuthConfig } from "@/core/secure-auth-runtime";

function parseOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function localhostAlias(origin: URL): URL | null {
  if (origin.hostname === "localhost") {
    const alias = new URL(origin.toString());
    alias.hostname = "127.0.0.1";
    return alias;
  }
  if (origin.hostname === "127.0.0.1") {
    const alias = new URL(origin.toString());
    alias.hostname = "localhost";
    return alias;
  }
  return null;
}

export function getPrimaryWebAuthnOrigin(): string {
  const { webauthn } = getSecureAuthConfig();
  const configured = parseOrigin(webauthn.origin);
  if (configured) return configured.origin;

  const baseUrl = parseOrigin(getSecureAuthConfig().app.baseUrl);
  if (baseUrl) return baseUrl.origin;

  return "http://localhost:3001";
}

export function getWebAuthnOrigins(): string[] {
  const origins = new Set<string>();
  const primary = getPrimaryWebAuthnOrigin();
  origins.add(primary);

  const primaryUrl = parseOrigin(primary);
  if (primaryUrl) {
    const alias = localhostAlias(primaryUrl);
    if (alias) origins.add(alias.origin);
  }

  const configured = parseOrigin(getSecureAuthConfig().webauthn.origin);
  if (configured) {
    origins.add(configured.origin);
    const alias = localhostAlias(configured);
    if (alias) origins.add(alias.origin);
  }

  return [...origins];
}

export function getWebAuthnRpId(): string {
  const rpId = getSecureAuthConfig().webauthn.rpId?.trim();
  if (rpId) return rpId;

  const origin = parseOrigin(getPrimaryWebAuthnOrigin());
  if (origin?.hostname) return origin.hostname;

  return "localhost";
}

export function getWebAuthnRpName(): string {
  return getSecureAuthConfig().webauthn.rpName || getSecureAuthConfig().app.name;
}

export function toPasskeyVerificationErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/origin/i.test(message)) {
    return `Passkey sign-in must use ${getPrimaryWebAuthnOrigin()}. Open the app at that address and try again.`;
  }

  if (/expired|timeout/i.test(message)) {
    return "Your passkey challenge expired. Try again.";
  }

  if (/credential id not found|unknown credential/i.test(message)) {
    return "This passkey is not registered for sign-in.";
  }

  return "Passkey authentication failed. Try again.";
}