/**
 * Intentional prop override — proves precedence: explicit prop > SecureAuthUIProvider > package default.
 * uiConfig sets loginTitle to "Sign in to Consumer Demo"; this title wins.
 */
import { LoginPage } from "@tgoliveira/secure-auth/react";

export default function Page() {
  return <LoginPage title="Prop override: custom sign-in title" />;
}
