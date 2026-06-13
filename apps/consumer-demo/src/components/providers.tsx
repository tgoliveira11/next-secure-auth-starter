"use client";

import { SessionProvider } from "next-auth/react";
import {
  SecureAuthUIProvider,
  type SecureAuthUIPublicConfig,
} from "@tgoliveira/secure-auth/react";

export function Providers({
  children,
  uiConfig,
}: {
  children: React.ReactNode;
  uiConfig: SecureAuthUIPublicConfig;
}) {
  return (
    <SessionProvider>
      <SecureAuthUIProvider config={uiConfig}>{children}</SecureAuthUIProvider>
    </SessionProvider>
  );
}
