"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { SecureAuthUIPublicConfig } from "../../core/ui-config.js";
import { SingleActiveSessionMonitor } from "./single-active-session-monitor.js";

const SecureAuthUIContext = createContext<SecureAuthUIPublicConfig | null>(null);

export type SecureAuthUIProviderProps = {
  /** Serializable UI defaults from `createSecureAuth(config).uiConfig`. */
  config?: SecureAuthUIPublicConfig | null;
  children: ReactNode;
};

/** Supplies default page copy, paths, and policy settings to package React pages. */
export function SecureAuthUIProvider({ config, children }: SecureAuthUIProviderProps) {
  const value = useMemo(() => config ?? null, [config]);

  useEffect(() => {
    if (!value?.cssVariables) return;
    const root = document.documentElement;
    for (const [key, cssValue] of Object.entries(value.cssVariables)) {
      root.style.setProperty(key, cssValue);
    }
  }, [value?.cssVariables]);

  return (
    <SecureAuthUIContext.Provider value={value}>
      {value?.sessionPolicy.singleActiveSession ? <SingleActiveSessionMonitor /> : null}
      {children}
    </SecureAuthUIContext.Provider>
  );
}

/** Returns provider config when wrapped; otherwise `null` (pages fall back to package defaults). */
export function useSecureAuthUi(): SecureAuthUIPublicConfig | null {
  return useContext(SecureAuthUIContext);
}
