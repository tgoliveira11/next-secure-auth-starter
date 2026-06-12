import { createHash, randomBytes } from "node:crypto";
import { requireNextAuthSecret } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(config: SecureAuthConfig, token: string): string {
  const pepper = requireNextAuthSecret(config);
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
}
