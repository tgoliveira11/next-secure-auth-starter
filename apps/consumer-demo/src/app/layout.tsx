import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { secureAuth } from "@/lib/secure-auth";

export const metadata: Metadata = {
  title: "Consumer Demo",
  description: "Validation app for @tgoliveira/secure-auth public package exports.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // `getResolvedUIConfig()` applies admin panel config overrides (e.g. `ui.login.twoStep`).
  // Use `secureAuth.uiConfig` instead when the layout must stay static.
  const uiConfig = await secureAuth.getResolvedUIConfig();

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers uiConfig={uiConfig}>{children}</Providers>
      </body>
    </html>
  );
}
