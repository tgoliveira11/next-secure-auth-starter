import { createHash } from "node:crypto";
import { requireNextAuthSecret } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";

/** Scoped rate-limit identifier — never store or log the raw email. */
export function hashEmailForScope(config: SecureAuthConfig, email: string): string {
  const pepper = requireNextAuthSecret(config);
  const normalized = email.trim().toLowerCase();
  return createHash("sha256").update(`${pepper}:email-scope:${normalized}`).digest("hex");
}
