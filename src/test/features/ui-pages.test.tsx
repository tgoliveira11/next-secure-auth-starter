/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
import AccountDeletedPage from "@/app/(public)/account-deleted/page";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";

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

describe("UI pages and components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders landing page with starter heading and create account CTA", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /next secure auth starter/i })).toBeTruthy();
    const createLinks = screen.getAllByRole("link", { name: /create account/i });
    expect(createLinks.some((link) => link.getAttribute("href") === "/register")).toBe(true);
    expect(screen.getByText(/secure authentication starter/i)).toBeTruthy();
  });

  it("renders login page with labeled fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });

  it("renders register page with social options", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeTruthy();
    expect(screen.getByText(/email\/password sign-in/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with apple/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with microsoft/i })).toBeTruthy();
  });

  it("renders account deleted page", () => {
    render(<AccountDeletedPage />);
    expect(screen.getByText(/your account has been deleted/i)).toBeTruthy();
  });

  it("renders generic empty state", () => {
    render(<EmptyState title="Nothing here yet" description="Try again later." />);
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
  });

  it("renders accessible loading state", () => {
    render(<LoadingState label="Loading account settings" />);
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
  });
});
