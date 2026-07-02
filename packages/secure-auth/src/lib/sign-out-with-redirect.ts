"use client";

import { signOut } from "next-auth/react";

/** Clears the NextAuth session and redirects to the configured post-logout path. */
export function signOutWithRedirect(afterLogoutPath: string = "/"): void {
  void signOut({ callbackUrl: afterLogoutPath });
}
