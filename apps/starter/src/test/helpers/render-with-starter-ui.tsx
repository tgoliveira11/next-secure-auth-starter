/** @vitest-environment happy-dom */
import { render, type RenderOptions } from "@testing-library/react";
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import { starterTestUiConfig } from "./starter-test-ui-config";

export function renderWithStarterUi(ui: React.ReactElement, options?: RenderOptions) {
  return render(
    <SecureAuthUIProvider config={starterTestUiConfig}>{ui}</SecureAuthUIProvider>,
    options
  );
}
