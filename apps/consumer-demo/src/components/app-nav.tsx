"use client";

/**
 * CONSUMER-DEMO CUSTOMIZATION
 * Unified top navigation bar for all authenticated pages.
 *
 * This component is NOT part of @tgoliveira/secure-auth.
 * It uses package primitives (useUiPaths, Button) but the layout,
 * branding and link structure are consumer-owned.
 *
 * To adapt for your app:
 *  - Replace the logo/wordmark with your own brand
 *  - Add or remove nav items as needed
 *  - Change the sign-out destination via callbackUrl
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button, useUiPaths } from "@tgoliveira/secure-auth/react";

const NAV_ITEMS = [
  { key: "afterLogin" as const, label: "Dashboard" },
  { key: "accountSettings" as const, label: "Account" },
  { key: "securitySettings" as const, label: "Security" },
  { key: "sessionsSettings" as const, label: "Sessions" },
];

export function AppNav() {
  const resolved = useUiPaths();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-0">
        {/* Brand */}
        <Link
          href={resolved.afterLogin}
          className="flex shrink-0 items-center gap-2 py-3 text-sm font-semibold text-[var(--foreground)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--primary)] text-[10px] font-bold text-white">
            CD
          </span>
          Consumer Demo
        </Link>

        <div className="h-5 w-px shrink-0 bg-[var(--border)]" />

        {/* Nav links */}
        <nav className="flex flex-1 items-center gap-1">
          {NAV_ITEMS.map(({ key, label }) => {
            const href = resolved[key];
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={key}
                href={href}
                className={[
                  "rounded px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "font-medium text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:bg-[var(--card-muted)] hover:text-[var(--foreground)]",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <Button
          variant="secondary"
          onClick={() => signOut({ callbackUrl: resolved.login })}
          className="shrink-0 text-sm"
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
