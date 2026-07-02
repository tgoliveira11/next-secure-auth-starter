/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OAuthTwoFactorForm } from "@/components/auth/oauth-two-factor-form";

describe("OAuthTwoFactorForm", () => {
  it("uses a native POST to /login/2fa for password managers", () => {
    render(<OAuthTwoFactorForm usernameEmail="user@example.com" />);
    const form = screen.getByRole("button", { name: "Continue" }).closest("form") as HTMLFormElement;
    expect(form.getAttribute("action")).toBe("/login/2fa");
    expect(form.getAttribute("method")).toBe("post");
    expect(form.querySelector('input[name="mode"][value="oauth"]')).toBeTruthy();
    expect(form.querySelector('input[name="username"][autocomplete="username"]')).toBeTruthy();
    expect(form.querySelector('input[name="code"]')?.getAttribute("autocomplete")).toBe("one-time-code");
  });

  it("shows query-string errors for failed native submissions", () => {
    render(<OAuthTwoFactorForm errorCode="invalid_code" />);
    expect(screen.getByRole("alert").textContent).toContain("Invalid authenticator or backup code");
  });
});
