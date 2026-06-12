import type { SecureAuthConfig, SecureAuthDb } from "./types.js";

export type SecureAuthRuntime = {
  readonly config: SecureAuthConfig;
  readonly db: SecureAuthDb;
};

let activeRuntime: SecureAuthRuntime | null = null;

/**
 * Binds explicit dependencies for the current secure-auth instance.
 * Called once from createSecureAuth(config) — not a service locator for optional deps.
 */
export function initSecureAuthRuntime(config: SecureAuthConfig): SecureAuthRuntime {
  const runtime: SecureAuthRuntime = Object.freeze({
    config,
    db: config.db,
  });
  activeRuntime = runtime;
  return runtime;
}

export function getSecureAuthRuntime(): SecureAuthRuntime {
  if (!activeRuntime) {
    throw new Error(
      "@tgoliveira/secure-auth: runtime not initialized. Call createSecureAuth({ db, ... }) first."
    );
  }
  return activeRuntime;
}

export function getSecureAuthConfig(): SecureAuthConfig {
  return getSecureAuthRuntime().config;
}

export function getSecureAuthDb(): SecureAuthDb {
  return getSecureAuthRuntime().db;
}

/** Test-only reset — not part of the public API surface. */
export function resetSecureAuthRuntimeForTests(): void {
  activeRuntime = null;
}
