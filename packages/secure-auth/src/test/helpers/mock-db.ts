import type { SecureAuthDb } from "../../core/types.js";

/** Minimal stand-in when handlers only need runtime init, not real queries. */
export function createMockDb(): SecureAuthDb {
  return {} as SecureAuthDb;
}