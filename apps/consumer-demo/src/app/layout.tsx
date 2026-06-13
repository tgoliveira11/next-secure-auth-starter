import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { secureAuth } from "@/lib/secure-auth";

export const metadata: Metadata = {
  title: "Consumer Demo",
  description: "Validation app for @tgoliveira/secure-auth public package exports.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers uiConfig={secureAuth.uiConfig}>{children}</Providers>
      </body>
    </html>
  );
}
