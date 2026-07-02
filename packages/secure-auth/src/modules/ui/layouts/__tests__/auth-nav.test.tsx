/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthNav } from "@/modules/ui/layouts/auth-nav";
import { SecureAuthUIProvider } from "@/modules/ui/secure-auth-ui-provider";
import { DEFAULT_AUTH_PATHS } from "@/modules/ui/pages/types";
import { DEFAULT_TEST_PUBLIC_AUTH } from "@/test/helpers/default-public-auth";

const signOut = vi.fn();

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOut(...args),
}));

describe("AuthNav sign out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue(undefined);
  });

  it("redirects to paths.afterLogout after sign out", () => {
    render(
      <SecureAuthUIProvider
        config={{
          appSlug: "test-app",
          appName: "Test App",
          paths: { ...DEFAULT_AUTH_PATHS, afterLogout: "/welcome" },
          messages: {},
          passwordPolicy: {
            enforcement: "warn",
            minLength: 12,
            requireUppercase: false,
            requireLowercase: false,
            requireNumber: false,
            requireSymbol: false,
            blockCommonPasswords: true,
            minScore: 2,
          },
          passwordStrength: { position: "above" },
          sessionPolicy: { singleActiveSession: false, revocationPollIntervalSeconds: 0 },
          auth: DEFAULT_TEST_PUBLIC_AUTH,
        }}
      >
        <AuthNav />
      </SecureAuthUIProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/welcome" });
  });
});
