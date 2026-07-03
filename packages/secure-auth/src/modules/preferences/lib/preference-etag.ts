import type { UserPreferenceRow } from "../repositories/user-preferences-repository.js";

/** Weak ETag derived from `updated_at` (milliseconds since epoch). */
export function buildPreferenceEtag(updatedAt: Date): string {
  return `"${updatedAt.getTime()}"`;
}

export function etagFromPreferenceRow(row: Pick<UserPreferenceRow, "updatedAt">): string {
  return buildPreferenceEtag(row.updatedAt);
}

export function normalizeIfMatchHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function etagsMatch(current: string, ifMatch: string): boolean {
  if (ifMatch === "*") return true;
  return current === ifMatch;
}
