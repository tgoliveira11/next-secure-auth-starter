/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OAuthTwoFactorForm } from "@/components/auth/oauth-two-factor-form";

const push = vi.fn();
const update = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("@tgoliveira/secure-auth/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/secure-auth/client")>();
  return {
    ...actual,
    authLoginApi: {
      verifyOAuthTwoFactor: vi.fn(),
    },
  };
});

describe("OAuthTwoFactorForm", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-id" } },
      status: "authenticated",
      update,
    } as never);
  });

  it("requires an authenticated session", async () => {
    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update,
    } as never);

    render(<OAuthTwoFactorForm />);
    fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Authentication required.");
  });

  it("upgrades the oauth session after a valid code", async () => {
    const { authLoginApi } = await import("@tgoliveira/secure-auth/client");
    vi.mocked(authLoginApi.verifyOAuthTwoFactor).mockResolvedValue({ upgradeToken: "upgrade-token" });

    render(<OAuthTwoFactorForm />);
    fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ twoFactorUpgradeToken: "upgrade-token" });
      expect(push).toHaveBeenCalledWith("/dashboard");
    });
  });
});
