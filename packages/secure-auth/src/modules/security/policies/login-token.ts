import { createHash, randomBytes } from "node:crypto";
import { requireNextAuthSecret } from "@/core/app-brand.js";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  const pepper = requireNextAuthSecret();
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
}