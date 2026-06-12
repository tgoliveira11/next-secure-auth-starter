"use client";

import type { ReactNode } from "react";
import { cn, MAIN_CONTENT_ID } from "@tgoliveira/secure-auth/client";
import type { PageWidth } from "../pages/types.js";

const widthClass: Record<PageWidth, string> = {
  narrow: "max-w-md",
  medium: "max-w-xl",
  wide: "max-w-2xl",
};

export type PageShellProps = {
  children: ReactNode;
  width?: PageWidth;
  className?: string;
};

/** Domain-neutral page shell without app navigation — consumers add Nav in their layout. */
export function PageShell({ children, width = "wide", className }: PageShellProps) {
  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className={cn("mx-auto px-4 py-8 md:py-10", widthClass[width], className)}
    >
      {children}
    </main>
  );
}
