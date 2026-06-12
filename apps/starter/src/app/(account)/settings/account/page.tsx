import { AccountSettingsPage } from "@tgoliveira/secure-auth/react";
import { signOutAccount } from "@/lib/sign-out-account";

export default function Page() {
  return <AccountSettingsPage onSignOut={signOutAccount} />;
}
