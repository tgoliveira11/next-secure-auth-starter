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
  const refetchInterval = uiConfig.sessionPolicy.revocationPollIntervalSeconds;

  return (
    <SessionProvider refetchInterval={refetchInterval > 0 ? refetchInterval : undefined}>
      <SecureAuthUIProvider config={uiConfig}>{children}</SecureAuthUIProvider>
    </SessionProvider>
  );
}
