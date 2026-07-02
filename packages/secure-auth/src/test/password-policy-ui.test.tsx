/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegisterPage } from "@/modules/ui/pages/register-page";
import { ResetPasswordPage } from "@/modules/ui/pages/reset-password-page";
import { DEFAULT_AUTH_PATHS } from "@/modules/ui/pages/types";
import type { SecureAuthUIPublicConfig } from "@/core/ui-config";
import { SecureAuthUIProvider } from "@/modules/ui/secure-auth-ui-provider";
import { ChangePasswordSettings } from "@/modules/ui/features/settings/change-password-settings";
import type { PasswordPolicyConfig } from "@tgoliveira/secure-auth/client/password-policy";
import { DEFAULT_TEST_PUBLIC_AUTH } from "./helpers/default-public-auth.js";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push, replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams("token=test-reset-token-1234567890")),
}));

vi.mock("@tgoliveira/secure-auth/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/secure-auth/client")>();
  return {
    ...actual,
    accountAuthApi: {
      ...actual.accountAuthApi,
      resetPassword: vi.fn(),
      changePassword: vi.fn(),
    },
  };
});

function uiConfigWithMinLength(minLength: number): SecureAuthUIPublicConfig {
  const passwordPolicy: PasswordPolicyConfig = {
    enforcement: "warn",
    minLength,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSymbol: false,
    blockCommonPasswords: true,
    minScore: 2,
  };

  return {
    appSlug: "provider-app",
    appName: "Provider App",
    paths: DEFAULT_AUTH_PATHS,
    messages: {},
    passwordPolicy,
    passwordStrength: { position: "above" },
    auth: DEFAULT_TEST_PUBLIC_AUTH,
    sessionPolicy: {
      singleActiveSession: false,
      revocationPollIntervalSeconds: 0,
    },
  };
}

describe("password policy UI propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RegisterPage shows configured minLength from SecureAuthUIProvider", () => {
    render(
      <SecureAuthUIProvider config={uiConfigWithMinLength(5)}>
        <RegisterPage />
      </SecureAuthUIProvider>
    );

    expect(screen.getByText(/At least 5 characters/)).toBeTruthy();
    expect((screen.getByLabelText("Password") as HTMLInputElement).minLength).toBe(5);
  });

  it("ResetPasswordPage shows configured minLength from SecureAuthUIProvider", async () => {
    render(
      <SecureAuthUIProvider config={uiConfigWithMinLength(5)}>
        <ResetPasswordPage />
      </SecureAuthUIProvider>
    );

    expect(await screen.findByLabelText("New password")).toBeTruthy();
    expect(screen.getByText(/At least 5 characters/)).toBeTruthy();
    expect((screen.getByLabelText("New password") as HTMLInputElement).minLength).toBe(5);
  });

  it("ChangePasswordSettings shows configured minLength from SecureAuthUIProvider", () => {
    render(
      <SecureAuthUIProvider config={uiConfigWithMinLength(5)}>
        <ChangePasswordSettings canChangePassword authProvider="credentials" />
      </SecureAuthUIProvider>
    );

    expect(screen.getByText(/At least 5 characters/)).toBeTruthy();
    expect((screen.getByLabelText("New password") as HTMLInputElement).minLength).toBe(5);
  });
});
