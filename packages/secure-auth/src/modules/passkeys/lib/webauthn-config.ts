import type { SecureAuthConfig } from "@/core/types.js";

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

/** Accept both apex and www (or strip www) for production domains. */
function wwwAlias(origin: URL): URL | null {
  const { hostname } = origin;
  if (hostname === "localhost" || hostname === "127.0.0.1" || !hostname.includes(".")) {
    return null;
  }

  if (hostname.startsWith("www.")) {
    const alias = new URL(origin.toString());
    alias.hostname = hostname.slice(4);
    return alias;
  }

  const alias = new URL(origin.toString());
  alias.hostname = `www.${hostname}`;
  return alias;
}

function addOriginVariants(origin: URL, into: Set<string>) {
  into.add(origin.origin);
  const localhost = localhostAlias(origin);
  if (localhost) into.add(localhost.origin);
  const www = wwwAlias(origin);
  if (www) into.add(www.origin);
}

function addOriginString(value: string | undefined, into: Set<string>) {
  const parsed = parseOrigin(value);
  if (parsed) addOriginVariants(parsed, into);
}

export function getPrimaryWebAuthnOrigin(config: SecureAuthConfig): string {
  const configured = parseOrigin(config.webauthn.origin);
  if (configured) return configured.origin;

  const baseUrl = parseOrigin(config.app.baseUrl);
  if (baseUrl) return baseUrl.origin;

  return "http://localhost:3001";
}

export function getWebAuthnOrigins(config: SecureAuthConfig): string[] {
  const origins = new Set<string>();

  addOriginString(getPrimaryWebAuthnOrigin(config), origins);
  addOriginString(config.webauthn.origin, origins);
  addOriginString(config.app.baseUrl, origins);

  for (const extra of config.webauthn.origins ?? []) {
    addOriginString(extra, origins);
  }

  return [...origins];
}

export function getWebAuthnRpId(config: SecureAuthConfig): string {
  const rpId = config.webauthn.rpId?.trim();
  if (rpId) return rpId;

  const origin = parseOrigin(getPrimaryWebAuthnOrigin(config));
  if (origin?.hostname) return origin.hostname;

  return "localhost";
}

export function getWebAuthnRpName(config: SecureAuthConfig): string {
  return config.webauthn.rpName || config.app.name;
}

export function toPasskeyVerificationErrorMessage(
  config: SecureAuthConfig,
  error: unknown
): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/origin/i.test(message)) {
    const allowed = getWebAuthnOrigins(config);
    if (allowed.length > 1) {
      return `Passkey sign-in must use one of: ${allowed.join(", ")}. Open the app at a matching address and try again.`;
    }
    return `Passkey sign-in must use ${getPrimaryWebAuthnOrigin(config)}. Open the app at that address and try again.`;
  }

  if (/expired|timeout/i.test(message)) {
    return "Your passkey challenge expired. Try again.";
  }

  if (/credential id not found|unknown credential/i.test(message)) {
    return "This passkey is not registered for sign-in.";
  }

  return "Passkey authentication failed. Try again.";
}
