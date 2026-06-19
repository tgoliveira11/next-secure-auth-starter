/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "@/app/(auth)/verify-email/page";
import { renderWithStarterUi } from "@/test/helpers/render-with-starter-ui";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=abc"),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@tgoliveira/secure-auth/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/secure-auth/client")>();
  return {
    ...actual,
    accountAuthApi: {
      ...actual.accountAuthApi,
      confirmVerification: vi.fn(async () => ({ verified: true, email: "user@example.com" })),
    },
  };
});

describe("verify email page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows success state", async () => {
    renderWithStarterUi(<VerifyEmailPage />);
    await waitFor(() => {
      expect(screen.getByText(/Your email has been verified/i)).toBeTruthy();
    });
  });
});
