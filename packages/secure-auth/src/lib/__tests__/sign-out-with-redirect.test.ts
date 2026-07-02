/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { signOutWithRedirect } from "@/lib/sign-out-with-redirect";

const signOut = vi.fn();

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOut(...args),
}));

describe("signOutWithRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue(undefined);
  });

  it("redirects to the configured post-logout path", () => {
    signOutWithRedirect("/welcome");
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/welcome" });
  });

  it("defaults to home when no path is provided", () => {
    signOutWithRedirect();
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});
