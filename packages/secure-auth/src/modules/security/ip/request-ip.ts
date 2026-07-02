/** Best-effort client IP for rate limiting (supports common proxy headers when explicitly trusted). */
import type { SecureAuthConfig } from "@/core/types";

export function resolveTrustForwardedHeaders(config?: SecureAuthConfig): boolean {
  return config?.security?.trustForwardedHeaders === true;
}

export function getClientIp(request: Request, config?: SecureAuthConfig): string {
  if (!resolveTrustForwardedHeaders(config)) {
    return "unknown-ip";
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown-ip";
}
