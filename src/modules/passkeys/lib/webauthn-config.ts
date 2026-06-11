import { APP_NAME } from "@/lib/brand";

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
  const configured = parseOrigin(process.env.WEBAUTHN_ORIGIN);
  if (configured) return configured.origin;

  const authUrl = parseOrigin(process.env.NEXTAUTH_URL);
  if (authUrl) return authUrl.origin;

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

  const configured = parseOrigin(process.env.WEBAUTHN_ORIGIN);
  if (configured) {
    origins.add(configured.origin);
    const alias = localhostAlias(configured);
    if (alias) origins.add(alias.origin);
  }

  return [...origins];
}

export function getWebAuthnRpId(): string {
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID;

  const origin = parseOrigin(getPrimaryWebAuthnOrigin());
  if (origin?.hostname) return origin.hostname;

  return "localhost";
}

export function getWebAuthnRpName(): string {
  return process.env.WEBAUTHN_RP_NAME ?? APP_NAME;
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
