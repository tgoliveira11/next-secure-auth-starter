"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "../primitives/button.js";
import { useUiPaths } from "../pages/use-page-ui.js";
import type { AuthPaths } from "../pages/types.js";

type AuthNavProps = {
  paths?: AuthPaths;
  activePath?: string;
};

export function AuthNav({ paths, activePath }: AuthNavProps) {
  const resolved = useUiPaths(paths);

  const navLinks = [
    { href: resolved.afterLogin, label: "Dashboard" },
    { href: resolved.accountSettings, label: "Account" },
    { href: resolved.securitySettings, label: "Security" },
    { href: resolved.sessionsSettings, label: "Sessions" },
  ];

  return (
    <nav className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2">
      <div className="flex items-center gap-1">
        {navLinks.map(({ href, label }) => {
          const isActive = activePath === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                "rounded px-3 py-1.5 text-sm",
                isActive
                  ? "font-medium text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--card-muted)] hover:text-[var(--foreground)]",
              ].join(" ")}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <Button variant="secondary" onClick={() => signOut({ callbackUrl: resolved.login })}>
        Sign out
      </Button>
    </nav>
  );
}
