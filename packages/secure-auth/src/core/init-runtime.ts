import { initSecureAuthRuntime } from "./secure-auth-runtime.js";
import type { SecureAuthConfig } from "./types.js";

/** @deprecated Use initSecureAuthRuntime from secure-auth-runtime */
export function initSecureAuthRuntimeLegacy(config: SecureAuthConfig): void {
  initSecureAuthRuntime(config);
}

export { initSecureAuthRuntime } from "./secure-auth-runtime.js";
