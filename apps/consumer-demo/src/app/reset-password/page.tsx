/**
 * Intentional prop override — proves legacy password feedback placement can be restored per page.
 * Global uiConfig uses the package default (`above`); this page renders feedback below the field.
 */
import { ResetPasswordPage } from "@tgoliveira/secure-auth/react";

export default function Page() {
  return <ResetPasswordPage passwordStrengthPosition="below" />;
}
