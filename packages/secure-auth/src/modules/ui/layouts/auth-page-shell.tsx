"use client";

import type { ReactNode } from "react";
import { PageShell, type PageShellProps } from "./page-shell.js";

export type AuthPageShellProps = PageShellProps & {
  children: ReactNode;
};

/** Narrow auth flow shell (sign-in, register, 2FA) without app navigation. */
export function AuthPageShell({ children, width = "narrow", className }: AuthPageShellProps) {
  return (
    <PageShell width={width} className={className}>
      {children}
    </PageShell>
  );
}
