import "server-only";
import { resolveSameOriginProtectionConfig } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";

export class SameOriginError extends Error {
  constructor(message = "Cross-origin request rejected") {
    super(message);
    this.name = "SameOriginError";
  }
}

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function collectAllowedOrigins(config: SecureAuthConfig): Set<string> {
  const resolved = resolveSameOriginProtectionConfig(config);
  const origins = new Set<string>();

  for (const candidate of resolved.allowedOrigins) {
    const origin = normalizeOrigin(candidate);
    if (origin) origins.add(origin);
  }

  const baseOrigin = normalizeOrigin(config.app.baseUrl);
  if (baseOrigin) origins.add(baseOrigin);

  const webauthnOrigin = normalizeOrigin(config.webauthn.origin);
  if (webauthnOrigin) origins.add(webauthnOrigin);

  for (const extra of config.webauthn.origins ?? []) {
    const origin = normalizeOrigin(extra);
    if (origin) origins.add(origin);
  }

  return origins;
}

function originFromReferer(referer: string): string | null {
  return normalizeOrigin(referer);
}

/**
 * Validates that mutating authenticated requests originate from an allowed app origin.
 * Skipped when same-origin protection is disabled in config.
 */
export function requireSameOriginRequest(request: Request, config: SecureAuthConfig): void {
  const protection = resolveSameOriginProtectionConfig(config);
  if (!protection.enabled) return;

  const allowed = collectAllowedOrigins(config);
  if (allowed.size === 0) {
    throw new SameOriginError(
      "Same-origin protection is enabled but no allowed origins are configured"
    );
  }

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    const origin = normalizeOrigin(originHeader);
    if (!origin || !allowed.has(origin)) {
      throw new SameOriginError();
    }
    return;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    const origin = originFromReferer(referer);
    if (origin && allowed.has(origin)) {
      return;
    }
  }

  throw new SameOriginError();
}
