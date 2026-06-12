"use client";

import type { ReactNode } from "react";
import { Nav } from "@/components/layout/nav";

/** Starter app shell: shared navigation around package page components. */
export function StarterShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
