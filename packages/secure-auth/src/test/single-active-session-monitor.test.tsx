/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { SingleActiveSessionMonitor } from "../modules/ui/single-active-session-monitor.js";
import { SecureAuthUIProvider } from "../modules/ui/secure-auth-ui-provider.js";
import { DEFAULT_AUTH_PATHS } from "../modules/ui/pages/types.js";
import type { SecureAuthUIPublicConfig } from "../core/ui-config.js";
import { DEFAULT_TEST_PUBLIC_AUTH } from "./helpers/default-public-auth.js";

const getSession = vi.fn();
const signOut = vi.fn();
const useSession = vi.fn();

vi.mock("next-auth/react", () => ({
  getSession: (...args: unknown[]) => getSession(...args),
  signOut: (...args: unknown[]) => signOut(...args),
  useSession: () => useSession(),
}));

const uiConfig: SecureAuthUIPublicConfig = {
  appSlug: "test",
  appName: "Test",
  paths: DEFAULT_AUTH_PATHS,
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
  auth: DEFAULT_TEST_PUBLIC_AUTH,
  sessionPolicy: {
    singleActiveSession: true,
    revocationPollIntervalSeconds: 1,
  },
};

describe("SingleActiveSessionMonitor", () => {
  beforeEach(() => {
    getSession.mockReset();
    signOut.mockReset().mockResolvedValue(undefined);
    useSession.mockReturnValue({ status: "authenticated" });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { replace: vi.fn() },
    });
  });

  it("signs out and redirects when server session no longer has a user", async () => {
    getSession.mockResolvedValue(null);

    render(
      <SecureAuthUIProvider config={uiConfig}>
        <SingleActiveSessionMonitor />
      </SecureAuthUIProvider>
    );

    await waitFor(() => {
      expect(getSession).toHaveBeenCalled();
      expect(signOut).toHaveBeenCalledWith({ redirect: false });
      expect(window.location.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("does not sign out while session user is still present", async () => {
    getSession.mockResolvedValue({ user: { email: "a@example.com" }, expires: "" });

    render(
      <SecureAuthUIProvider config={uiConfig}>
        <SingleActiveSessionMonitor />
      </SecureAuthUIProvider>
    );

    await waitFor(() => {
      expect(getSession).toHaveBeenCalled();
    });

    expect(signOut).not.toHaveBeenCalled();
  });
});
