import type { SecureAuthEmailContent } from "@/core/types.js";

/** Returns a custom template result when provided, otherwise the package default. */
export function resolveEmailTemplate<T>(
  custom: ((input: T) => SecureAuthEmailContent) | undefined,
  input: T,
  fallback: () => SecureAuthEmailContent
): SecureAuthEmailContent {
  return custom ? custom(input) : fallback();
}
