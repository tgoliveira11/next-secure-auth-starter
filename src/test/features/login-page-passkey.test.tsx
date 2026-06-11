/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";
import { CredentialsLoginForm } from "@/components/auth/credentials-login-form";
import { LoginPasskeySection } from "@/components/auth/login-passkey-section";
import {
  PASSKEY_EMAIL_REQUIRED_MESSAGE,
  PASSKEY_LOGIN_CANCELLED_MESSAGE,
} from "@/lib/passkey/messages";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  signInWithPasskey: vi.fn(),
  isPasskeyLoginSupported: vi.fn(),
  getPasskeyLoginHint: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("@/features/passkey/sign-in-with-passkey", () => ({
  signInWithPasskey: mocks.signInWithPasskey,
  isPasskeyLoginSupported: mocks.isPasskeyLoginSupported,
  getPasskeyLoginUnsupportedMessage: () => "This browser does not support passkey sign-in.",
}));

vi.mock("@/lib/passkey/login-hint", () => ({
  getPasskeyLoginHint: mocks.getPasskeyLoginHint,
}));

vi.mock("@/components/auth/social-sign-in", () => ({
  SocialSignIn: () => <div>Social sign-in</div>,
}));

describe("login page credentials form", () => {
  it("uses a native POST to /login for password managers", () => {
    render(<CredentialsLoginForm />);
    const form = screen.getByRole("button", { name: "Sign in with email" }).closest("form")!;
    expect(form.getAttribute("action")).toBe("/login");
    expect(form.getAttribute("method")).toBe("post");
    expect(form.querySelector('input[name="email"]')).toBeTruthy();
    expect(form.querySelector('input[name="password"]')).toBeTruthy();
  });

  it("renders the login page shell", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });
});

describe("login page passkey sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPasskeyLoginSupported.mockReturnValue(true);
    mocks.getPasskeyLoginHint.mockReturnValue(null);
  });

  it("shows passkey sign-in option", async () => {
    render(
      <>
        <CredentialsLoginForm />
        <LoginPasskeySection />
      </>
    );
    expect(await screen.findByRole("button", { name: "Sign in with passkey" })).toBeTruthy();
  });

  it("routes to dashboard when passkey sign-in succeeds", async () => {
    mocks.getPasskeyLoginHint.mockReturnValue({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      credentialId: "cred-id",
    });
    mocks.signInWithPasskey.mockResolvedValue({
      outcome: "signed-in",
      redirectTo: "/dashboard",
    });
    render(
      <>
        <CredentialsLoginForm />
        <LoginPasskeySection />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign in with passkey" }));
    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("requires email before passkey sign-in when no saved hint exists", async () => {
    render(
      <>
        <CredentialsLoginForm />
        <LoginPasskeySection />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign in with passkey" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(PASSKEY_EMAIL_REQUIRED_MESSAGE);
    });
    expect(mocks.signInWithPasskey).not.toHaveBeenCalled();
  });

  it("allows passkey sign-in with a saved hint and no email", async () => {
    mocks.getPasskeyLoginHint.mockReturnValue({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      credentialId: "cred-id",
    });
    mocks.signInWithPasskey.mockResolvedValue({
      outcome: "signed-in",
      redirectTo: "/dashboard",
    });
    render(
      <>
        <CredentialsLoginForm />
        <LoginPasskeySection />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign in with passkey" }));
    await waitFor(() => {
      expect(mocks.signInWithPasskey).toHaveBeenCalledWith(undefined);
      expect(mocks.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("passes entered email to passkey sign-in", async () => {
    mocks.signInWithPasskey.mockResolvedValue({
      outcome: "signed-in",
      redirectTo: "/dashboard",
    });
    render(
      <>
        <CredentialsLoginForm />
        <LoginPasskeySection />
      </>
    );
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: " user@example.com " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with passkey" }));
    await waitFor(() => {
      expect(mocks.signInWithPasskey).toHaveBeenCalledWith({ email: "user@example.com" });
    });
  });

  it("uses autofilled email for passkey sign-in when react state is empty", async () => {
    mocks.signInWithPasskey.mockResolvedValue({
      outcome: "signed-in",
      redirectTo: "/dashboard",
    });
    render(
      <>
        <CredentialsLoginForm />
        <LoginPasskeySection />
      </>
    );
    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    emailInput.value = "user@example.com";
    fireEvent.click(screen.getByRole("button", { name: "Sign in with passkey" }));
    await waitFor(() => {
      expect(mocks.signInWithPasskey).toHaveBeenCalledWith({ email: "user@example.com" });
    });
  });

  it("shows cancellation message", async () => {
    mocks.getPasskeyLoginHint.mockReturnValue({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      credentialId: "cred-id",
    });
    mocks.signInWithPasskey.mockResolvedValue({
      outcome: "cancelled",
      redirectTo: "/login",
    });
    render(
      <>
        <CredentialsLoginForm />
        <LoginPasskeySection />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign in with passkey" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Passkey sign-in was cancelled.");
    });
  });
});
