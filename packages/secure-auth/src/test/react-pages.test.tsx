/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  SecureAuthUIProvider,
  DEFAULT_AUTH_PATHS,
  resolveAuthPaths,
  type SecureAuthUIPublicConfig,
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

  it("RegisterPage displays configured minLength from SecureAuthUIProvider", () => {
    const uiConfig: SecureAuthUIPublicConfig = {
      appSlug: "provider-app",
      appName: "Provider App",
      paths: DEFAULT_AUTH_PATHS,
      messages: {},
      passwordPolicy: {
        enforcement: "warn",
        minLength: 5,
        requireUppercase: false,
        requireLowercase: false,
        requireNumber: false,
        requireSymbol: false,
        blockCommonPasswords: true,
        minScore: 2,
      },
      passwordStrength: { position: "above" },
      sessionPolicy: {
        singleActiveSession: false,
        revocationPollIntervalSeconds: 0,
      },
    };

    render(
      <SecureAuthUIProvider config={uiConfig}>
        <RegisterPage />
      </SecureAuthUIProvider>
    );

    expect(screen.getByText(/At least 5 characters/)).toBeTruthy();
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.minLength).toBe(5);
  });

  it("ForgotPasswordPage renders without crashing", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole("heading", { name: /forgot your password/i })).toBeTruthy();
  });

  it("AccountDeletedPage renders without crashing", () => {
    render(<AccountDeletedPage />);
    expect(screen.getByText(/your account has been deleted/i)).toBeTruthy();
  });

  it("LoginPage uses SecureAuthUIProvider defaults", () => {
    const uiConfig: SecureAuthUIPublicConfig = {
      appSlug: "provider-app",
      appName: "Provider App",
      paths: DEFAULT_AUTH_PATHS,
      messages: { loginTitle: "Provider sign in" },
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
      sessionPolicy: {
        singleActiveSession: false,
        revocationPollIntervalSeconds: 0,
      },
    };

    render(
      <SecureAuthUIProvider config={uiConfig}>
        <LoginPage />
      </SecureAuthUIProvider>
    );

    expect(screen.getByRole("heading", { name: /provider sign in/i })).toBeTruthy();
  });

  it("LoginPage props override SecureAuthUIProvider config", () => {
    const uiConfig: SecureAuthUIPublicConfig = {
      appSlug: "provider-app",
      appName: "Provider App",
      paths: DEFAULT_AUTH_PATHS,
      messages: { loginTitle: "Provider sign in" },
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
      sessionPolicy: {
        singleActiveSession: false,
        revocationPollIntervalSeconds: 0,
      },
    };

    render(
      <SecureAuthUIProvider config={uiConfig}>
        <LoginPage title="Explicit title" />
      </SecureAuthUIProvider>
    );

    expect(screen.getByRole("heading", { name: /explicit title/i })).toBeTruthy();
  });

  it("RegisterPage renders password strength feedback above the field by default", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          enforcement: "warn",
          minLength: 12,
          requireUppercase: false,
          requireLowercase: false,
          requireNumber: false,
          requireSymbol: false,
          blockCommonPasswords: true,
          minScore: 2,
        }),
        { status: 200 }
      )
    );

    render(<RegisterPage appSlug="test-app" />);

    const passwordInput = await screen.findByLabelText("Password");
    fireEvent.change(passwordInput, { target: { value: "Riverstone-Kettle-2026!" } });

    const strength = await screen.findByText(/Strength:/);
    expect(
      strength.compareDocumentPosition(passwordInput) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("RegisterPage passwordStrengthPosition prop overrides provider config", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          enforcement: "warn",
          minLength: 12,
          requireUppercase: false,
          requireLowercase: false,
          requireNumber: false,
          requireSymbol: false,
          blockCommonPasswords: true,
          minScore: 2,
        }),
        { status: 200 }
      )
    );

    const uiConfig: SecureAuthUIPublicConfig = {
      appSlug: "provider-app",
      appName: "Provider App",
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
      sessionPolicy: {
        singleActiveSession: false,
        revocationPollIntervalSeconds: 0,
      },
    };

    render(
      <SecureAuthUIProvider config={uiConfig}>
        <RegisterPage appSlug="test-app" passwordStrengthPosition="below" />
      </SecureAuthUIProvider>
    );

    const passwordInput = await screen.findByLabelText("Password");
    fireEvent.change(passwordInput, { target: { value: "Riverstone-Kettle-2026!" } });

    const strength = await screen.findByText(/Strength:/);
    expect(
      passwordInput.compareDocumentPosition(strength) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
