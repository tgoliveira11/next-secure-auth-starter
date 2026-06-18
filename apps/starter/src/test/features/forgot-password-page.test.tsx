/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import { renderWithStarterUi } from "@/test/helpers/render-with-starter-ui";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@tgoliveira/secure-auth/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/secure-auth/client")>();
  return {
    ...actual,
    accountAuthApi: {
      ...actual.accountAuthApi,
      forgotPassword: vi.fn(async () => ({
        message: "If an account exists for this email, we'll send password reset instructions.",
      })),
    },
  };
});

describe("forgot password page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows generic success after submit", async () => {
    renderWithStarterUi(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset instructions" }));
    await waitFor(() => {
      expect(screen.getByText(/If an account exists/i)).toBeTruthy();
    });
  });
});
