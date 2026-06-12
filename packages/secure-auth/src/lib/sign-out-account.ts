import { signOut } from "next-auth/react";
import { accountSessionsApi } from "@tgoliveira/secure-auth/client";

/** Default sign-out helper: revokes the current server session then clears the NextAuth client session. */
export async function defaultSignOutAccount(): Promise<void> {
  await accountSessionsApi.revokeCurrent().catch(() => undefined);
  await signOut({ redirect: false });
}
