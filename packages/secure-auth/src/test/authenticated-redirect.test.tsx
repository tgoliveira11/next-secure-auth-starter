/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  CheckEmailPage,
  VerifyEmailPage,
  LoginTwoFactorPage,
  LoginCompletePage,
  SecureAuthUIProvider,
  DEFAULT_AUTH_PATHS,
  type SecureAuthUIPublicConfig,
} from "@tgoliveira/secure-auth/react";
import { DEFAULT_TEST_PUBLIC_AUTH } from "./helpers/default-public-auth.js";

const replace = vi.fn();
const push = vi.fn();
const useSession = vi.fn();
const signIn = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => useSession(),
  signIn: (...args: unknown[]) => signIn(...args),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const baseUiConfig: SecureAuthUIPublicConfig = {
  appSlug: "test-app",
  appName: "Test App",
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
  auth: DEFAULT_TEST_PUBLIC_AUTH,
};

function mockAuthenticatedSession(overrides: Record<string, unknown> = {}) {
  useSession.mockReturnValue({
    status: "authenticated",
    data: {
      user: { id: "user-1", email: "user@example.com" },
      twoFactorVerified: true,
      twoFactorPending: false,
      emailVerificationRequired: false,
      ...overrides,
    },
  });
}

describe("authenticated user auth page redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );
  });

  it("LoginPage renders for unauthenticated users", () => {
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <LoginPage appSlug="test-app" />
      </SecureAuthUIProvider>
    );
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
  });

  it("LoginPage redirects fully authenticated users", async () => {
    mockAuthenticatedSession();
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <LoginPage appSlug="test-app" />
      </SecureAuthUIProvider>
    );
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("LoginPage honors redirectIfAuthenticated={false}", async () => {
    mockAuthenticatedSession();
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <LoginPage appSlug="test-app" redirectIfAuthenticated={false} />
      </SecureAuthUIProvider>
    );
    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("RegisterPage redirects authenticated users", async () => {
    mockAuthenticatedSession();
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <RegisterPage />
      </SecureAuthUIProvider>
    );
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("ForgotPasswordPage redirects authenticated users", async () => {
    mockAuthenticatedSession();
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <ForgotPasswordPage />
      </SecureAuthUIProvider>
    );
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("ResetPasswordPage does not redirect authenticated users with token", async () => {
    mockAuthenticatedSession();
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ valid: true }), { status: 200 })
    );
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <ResetPasswordPage token="reset-token-1234567890" />
      </SecureAuthUIProvider>
    );
    expect(await screen.findByText(/choose a new password/i)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("CheckEmailPage redirects authenticated verified users", async () => {
    mockAuthenticatedSession();
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <CheckEmailPage email="user@example.com" />
      </SecureAuthUIProvider>
    );
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("CheckEmailPage allows authenticated users with verification pending", async () => {
    mockAuthenticatedSession({ emailVerificationRequired: true });
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <CheckEmailPage email="user@example.com" verificationRequired />
      </SecureAuthUIProvider>
    );
    expect(await screen.findByRole("heading", { name: /check your email/i })).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("LoginTwoFactorPage allows pending 2FA sessions", async () => {
    useSession.mockReturnValue({
      status: "authenticated",
      data: {
        user: { id: "user-1" },
        twoFactorVerified: false,
        twoFactorPending: true,
      },
    });
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <LoginTwoFactorPage mode="oauth" />
      </SecureAuthUIProvider>
    );
    expect(await screen.findByRole("heading", { name: /two-factor authentication/i })).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("LoginTwoFactorPage redirects fully authenticated users", async () => {
    mockAuthenticatedSession();
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <LoginTwoFactorPage mode="credentials" />
      </SecureAuthUIProvider>
    );
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("LoginCompletePage redirects already authenticated users", async () => {
    mockAuthenticatedSession();
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <LoginCompletePage />
      </SecureAuthUIProvider>
    );
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("LoginCompletePage completes pending login for unauthenticated users", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ loginToken: "login-token-1234567890" }), { status: 200 })
    );
    signIn.mockResolvedValue({ ok: true });
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <LoginCompletePage />
      </SecureAuthUIProvider>
    );
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/login/complete", expect.any(Object));
    });
  });

  it("VerifyEmailPage keeps token flows accessible for authenticated users", async () => {
    mockAuthenticatedSession();
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ email: "user@example.com" }), { status: 200 })
    );
    render(
      <SecureAuthUIProvider config={baseUiConfig}>
        <VerifyEmailPage token="verify-token-1234567890" />
      </SecureAuthUIProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/verified user@example.com/i)).toBeTruthy();
    });
    expect(replace).not.toHaveBeenCalled();
  });
});
