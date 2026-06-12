/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  AccountDeletedPage,
  LoginTwoFactorPage,
  CheckEmailPage,
  VerifyEmailPage,
  ResetPasswordPage,
  LoginCompletePage,
  AccountSettingsPage,
  SecuritySettingsPage,
  SessionsSettingsPage,
  DashboardPlaceholderPage,
  DEFAULT_AUTH_PATHS,
  resolveAuthPaths,
} from "@tgoliveira/secure-auth/react";

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

describe("@tgoliveira/secure-auth/react page exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports all required ready-to-use page components", () => {
    expect(LoginPage).toBeTypeOf("function");
    expect(RegisterPage).toBeTypeOf("function");
    expect(ForgotPasswordPage).toBeTypeOf("function");
    expect(ResetPasswordPage).toBeTypeOf("function");
    expect(CheckEmailPage).toBeTypeOf("function");
    expect(VerifyEmailPage).toBeTypeOf("function");
    expect(LoginTwoFactorPage).toBeTypeOf("function");
    expect(LoginCompletePage).toBeTypeOf("function");
    expect(AccountSettingsPage).toBeTypeOf("function");
    expect(SecuritySettingsPage).toBeTypeOf("function");
    expect(SessionsSettingsPage).toBeTypeOf("function");
    expect(AccountDeletedPage).toBeTypeOf("function");
    expect(DashboardPlaceholderPage).toBeTypeOf("function");
  });

  it("exports path helpers with sensible defaults", () => {
    expect(DEFAULT_AUTH_PATHS.login).toBe("/login");
    expect(resolveAuthPaths({ afterLogin: "/app" }).afterLogin).toBe("/app");
  });

  it("LoginPage renders without crashing", () => {
    render(<LoginPage appSlug="test-app" />);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
  });

  it("RegisterPage renders without crashing", () => {
    render(<RegisterPage appSlug="test-app" />);
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeTruthy();
  });

  it("ForgotPasswordPage renders without crashing", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole("heading", { name: /forgot your password/i })).toBeTruthy();
  });

  it("AccountDeletedPage renders without crashing", () => {
    render(<AccountDeletedPage />);
    expect(screen.getByText(/your account has been deleted/i)).toBeTruthy();
  });
});
