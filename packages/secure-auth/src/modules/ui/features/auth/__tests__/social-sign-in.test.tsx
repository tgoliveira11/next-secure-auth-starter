/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecureAuthUIProvider } from "../../../secure-auth-ui-provider.js";
import type { SecureAuthUIPublicConfig } from "../../../../../core/ui-config.js";
import { SocialSignIn, formatOAuthProviderNames } from "../social-sign-in.js";

const baseUiConfig = {
  appSlug: "test-app",
  appName: "Test App",
  paths: {},
  messages: {},
  passwordPolicy: {},
  passwordStrength: { position: "above" },
  sessionPolicy: { singleActiveSession: false, revocationPollIntervalSeconds: 0 },
  auth: {
    redirectAuthenticatedFromGuestPages: true,
    authenticatedRedirectPath: "/dashboard",
  },
} as SecureAuthUIPublicConfig;

describe("SocialSignIn", () => {
  it("renders only provider IDs supplied by the public UI config on the first render", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(
      <SecureAuthUIProvider
        config={{ ...baseUiConfig, oauthProviderIds: ["google", "github"] }}
      >
        <SocialSignIn />
      </SecureAuthUIProvider>
    );

    expect(screen.getByRole("button", { name: /continue with google/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with github/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /continue with apple/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /continue with microsoft/i })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("fails closed when provider discovery config is unavailable", () => {
    const { container } = render(<SocialSignIn />);
    expect(container.innerHTML).toBe("");
  });

  it("supports an explicit provider list for standalone composition", () => {
    render(<SocialSignIn providerIds={["azure-ad"]} />);
    expect(screen.getByRole("button", { name: /continue with microsoft/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /continue with google/i })).toBeNull();
  });

  it("formats provider names from the effective provider list", () => {
    expect(formatOAuthProviderNames([])).toBe("");
    expect(formatOAuthProviderNames(["google"])).toBe("Google");
    expect(formatOAuthProviderNames(["google", "github"])).toBe("Google and GitHub");
    expect(formatOAuthProviderNames(["google", "apple", "github"])).toBe(
      "Google, Apple, and GitHub"
    );
  });
});
