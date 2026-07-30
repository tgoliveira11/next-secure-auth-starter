/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { TwoStepLoginPanel } from "../two-step-login-panel.js";
import { SecureAuthUIProvider } from "../../../secure-auth-ui-provider.js";
import { DEFAULT_AUTH_PATHS } from "../../../pages/types.js";
import { DEFAULT_TEST_PUBLIC_AUTH } from "../../../../../test/helpers/default-public-auth.js";
import type { SecureAuthUIPublicConfig } from "../../../../../core/ui-config.js";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/login"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

function buildUiConfig(
  overrides: Partial<SecureAuthUIPublicConfig> = {}
): SecureAuthUIPublicConfig {
  return {
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
    auth: DEFAULT_TEST_PUBLIC_AUTH,
    sessionPolicy: { singleActiveSession: false, revocationPollIntervalSeconds: 0 },
    ...overrides,
  };
}

function renderPanel(config?: SecureAuthUIPublicConfig) {
  return render(
    <SecureAuthUIProvider config={config ?? buildUiConfig()}>
      <TwoStepLoginPanel appSlug="test-app" />
    </SecureAuthUIProvider>
  );
}

function passwordBlock(): HTMLElement {
  const block = document.getElementById("login-password-block");
  if (!block) throw new Error("password block not rendered");
  return block;
}

describe("TwoStepLoginPanel", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/login");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.turnstile;
  });

  it("shows only email, forgot password and OAuth on the first step", () => {
    renderPanel(buildUiConfig({ oauthProviderIds: ["google"] }));

    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /passkey/i })).toBeNull();
    expect(passwordBlock().hasAttribute("hidden")).toBe(true);
  });

  it("offers magic link on the first step when enabled", () => {
    renderPanel(buildUiConfig({ magicLink: { enabled: true } }));

    expect(screen.getByRole("button", { name: "Sign in with email link" })).toBeTruthy();
  });

  it("does not advance when the email is empty", () => {
    renderPanel();

    fireEvent.submit(document.getElementById("login-credentials-form") as HTMLFormElement);

    expect(passwordBlock().hasAttribute("hidden")).toBe(true);
  });

  it("reveals password and passkey on the second step while keeping the email in the form", () => {
    renderPanel(buildUiConfig({ oauthProviderIds: ["google"] }));

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: " person@example.com " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const email = screen.getByLabelText("Email") as HTMLInputElement;
    expect(email.value).toBe("person@example.com");
    expect(email.readOnly).toBe(true);
    expect(email.form?.id).toBe("login-credentials-form");
    expect(passwordBlock().hasAttribute("hidden")).toBe(false);
    expect((screen.getByLabelText("Password") as HTMLInputElement).required).toBe(true);
    expect(screen.getByRole("button", { name: /passkey/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).toBeNull();
  });

  it("returns to the first step and clears the typed password", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    const password = screen.getByLabelText("Password") as HTMLInputElement;
    fireEvent.change(password, { target: { value: "hunter2hunter2" } });

    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));

    expect(passwordBlock().hasAttribute("hidden")).toBe(true);
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    expect(window.sessionStorage.getItem("secure-auth:test-app:login-email-draft")).toBeNull();
  });

  it("restores the password step after a failed sign-in redirect", () => {
    window.sessionStorage.setItem("secure-auth:test-app:login-email-draft", "person@example.com");
    window.history.replaceState({}, "", "/login?error=invalid_credentials");

    renderPanel();

    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("person@example.com");
    expect(passwordBlock().hasAttribute("hidden")).toBe(false);
  });

  it("stays on the first step when there is no stored email to restore", () => {
    window.history.replaceState({}, "", "/login?error=invalid_credentials");

    renderPanel();

    expect(passwordBlock().hasAttribute("hidden")).toBe(true);
  });

  it("never puts the email in the URL", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(window.location.search).not.toContain("person@example.com");
  });

  it("keeps working when session storage is unavailable", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    renderPanel();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(passwordBlock().hasAttribute("hidden")).toBe(false);
    setItem.mockRestore();
  });

  it("renders a noscript fallback that reveals the full credentials form", () => {
    const html = renderToStaticMarkup(
      <SecureAuthUIProvider config={buildUiConfig()}>
        <TwoStepLoginPanel appSlug="test-app" />
      </SecureAuthUIProvider>
    );

    expect(html).toContain("<noscript>");
    expect(html).toContain("#login-password-block{display:block !important}");
    expect(html).toContain("#login-submit{display:block !important}");
    expect(html).toContain("#login-continue{display:none !important}");
  });

  it("only renders the captcha on the password step", () => {
    // Stub the Turnstile API so the widget never reaches for the remote script.
    window.turnstile = {
      render: () => "widget-id",
      reset: () => undefined,
      remove: () => undefined,
    };
    const config = buildUiConfig({
      captcha: {
        provider: "turnstile",
        siteKey: "site-key",
        pages: { login: true, register: false },
      },
    });
    renderPanel(config);

    expect(screen.queryByLabelText("Verification challenge")).toBeNull();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByLabelText("Verification challenge")).toBeTruthy();
  });
});
