import { SessionsSettingsPage } from "@tgoliveira/secure-auth/react";
import { signOutAccount } from "@/lib/sign-out-account";

export default function Page() {
  return <SessionsSettingsPage onSignOut={signOutAccount} />;
}
