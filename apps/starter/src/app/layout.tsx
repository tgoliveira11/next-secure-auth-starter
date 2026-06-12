import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SkipLink } from "@/components/layout/skip-link";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Secure account and authentication starter for Next.js applications.",
  openGraph: {
    title: APP_NAME,
    description: "Secure account and authentication starter for Next.js applications.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f5",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen antialiased">
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
