import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  PublicKeyCredentialHint,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";

const SUPPORTED_TRANSPORTS = new Set<AuthenticatorTransportFuture>([
  "ble",
  "cable",
  "hybrid",
  "internal",
  "nfc",
  "smart-card",
  "usb",
]);

type PasskeyAuthenticationCredential = {
  id: string;
  transports?: unknown;
};

export function normalizePasskeyAuthenticationTransports(
  transports: unknown
): AuthenticatorTransportFuture[] | undefined {
  if (!Array.isArray(transports)) return undefined;

  const normalized = new Set<AuthenticatorTransportFuture>();
  for (const transport of transports) {
    if (
      typeof transport === "string" &&
      SUPPORTED_TRANSPORTS.has(transport as AuthenticatorTransportFuture)
    ) {
      normalized.add(transport as AuthenticatorTransportFuture);
    }
  }

  if (normalized.size === 0) return undefined;

  const ordered: AuthenticatorTransportFuture[] = [];
  for (const preferred of ["internal", "hybrid"] as const) {
    if (normalized.delete(preferred)) ordered.push(preferred);
  }
  ordered.push(...normalized);
  return ordered;
}

function resolveAuthenticationHints(
  allowCredentials: Array<{ transports?: AuthenticatorTransportFuture[] }> | undefined
): PublicKeyCredentialHint[] | undefined {
  const transports = new Set(allowCredentials?.flatMap((credential) => credential.transports ?? []));
  return transports.has("internal") && transports.has("hybrid")
    ? ["client-device", "hybrid"]
    : undefined;
}

export async function buildPasskeyAuthenticationOptions(input: {
  rpID: string;
  allowCredentials?: PasskeyAuthenticationCredential[];
}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const allowCredentials = input.allowCredentials?.map((credential) => ({
    id: credential.id,
    transports: normalizePasskeyAuthenticationTransports(credential.transports),
  }));
  const options = await generateAuthenticationOptions({
    rpID: input.rpID,
    allowCredentials,
    userVerification: "required",
  });
  const hints = resolveAuthenticationHints(allowCredentials);

  return hints ? { ...options, hints } : options;
}
