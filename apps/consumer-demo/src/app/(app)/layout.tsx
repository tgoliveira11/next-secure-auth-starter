/**
 * CONSUMER-DEMO CUSTOMIZATION
 * Shared layout for all authenticated app pages (dashboard + settings).
 *
 * Adds the AppNav top bar above every page in this route group.
 * The package pages (DashboardPlaceholderPage, AccountSettingsPage, etc.)
 * are rendered as {children} inside this layout — they provide their own
 * PageShell/PageHeader, this layout only contributes the nav wrapper.
 *
 * This file does NOT exist in @tgoliveira/secure-auth.
 */

import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppNav />
      <main>{children}</main>
    </div>
  );
}
