import { createHash } from "node:crypto";
import { requireNextAuthSecret } from "@/core/app-brand.js";

/** Scoped rate-limit identifier — never store or log the raw email. */
export function hashEmailForScope(email: string): string {
  const pepper = requireNextAuthSecret();
  const normalized = email.trim().toLowerCase();
  return createHash("sha256").update(`${pepper}:email-scope:${normalized}`).digest("hex");
}