/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AccountSettingsPage from "@/app/(account)/settings/account/page";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@tgoliveira/secure-auth/client";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    status: "authenticated",
    data: { user: { id: "user-1", email: "user@test.local" } },
  })),
}));

vi.mock("@/lib/sign-out-account", () => ({
  signOutAccount: vi.fn(async () => undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
}));

vi.mock("@/components/layout/nav", () => ({
  Nav: () => <div>Nav</div>,
}));

vi.mock("@tgoliveira/secure-auth/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/secure-auth/client")>();
  return {
    ...actual,
    accountApi: {
      getDeletionRequirements: vi.fn(async () => ({
        requiresPassword: true,
        authProvider: "credentials",
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
      })),
      deleteAccount: vi.fn(async () => ({ success: true })),
    },
    accountAuthApi: {
      getAuthStatus: vi.fn(async () => ({
        email: "user@test.local",
        emailVerified: true,
        canChangePassword: true,
        hasPassword: true,
        authProvider: "credentials",
      })),
    },
    formatAuthProvider: (provider: string) => provider,
  };
});

describe("account deletion page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders account deletion UI", async () => {
    render(<AccountSettingsPage />);
    expect(await screen.findByText("Delete account")).toBeTruthy();
    expect(screen.getByText(/permanently removes your account/i)).toBeTruthy();
  });

  it("keeps delete button disabled until confirmation phrase matches", async () => {
    render(<AccountSettingsPage />);
    const button = (await screen.findByRole("button", {
      name: /delete my account permanently/i,
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/re-enter your password/i), {
      target: { value: "secret" },
    });
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/DELETE MY ACCOUNT/i), {
      target: { value: ACCOUNT_DELETION_CONFIRMATION_PHRASE },
    });
    expect(button.disabled).toBe(false);
  });
});
