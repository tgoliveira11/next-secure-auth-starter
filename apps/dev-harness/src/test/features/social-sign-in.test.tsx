/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SocialSignIn } from "@/components/auth/social-sign-in";
import { MICROSOFT_OAUTH_PROVIDER_ID } from "@tgoliveira/secure-auth/client";

const signIn = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

describe("SocialSignIn", () => {
  beforeEach(() => {
    signIn.mockClear();
  });

  it("renders only providers supplied by deterministic UI config", () => {
    const { container } = render(
      <SocialSignIn providerIds={["google", "apple", MICROSOFT_OAUTH_PROVIDER_ID]} />
    );
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with apple/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with microsoft/i })).toBeTruthy();
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThanOrEqual(3);
  });

  it("hides Microsoft when azure-ad is not configured", () => {
    render(<SocialSignIn providerIds={["google", "apple"]} />);
    expect(screen.queryByRole("button", { name: /continue with microsoft/i })).toBeNull();
  });

  it("starts Microsoft OAuth with the azure-ad provider id", () => {
    render(<SocialSignIn providerIds={[MICROSOFT_OAUTH_PROVIDER_ID]} />);
    fireEvent.click(screen.getByRole("button", { name: /continue with microsoft/i }));
    expect(signIn).toHaveBeenCalledWith(MICROSOFT_OAUTH_PROVIDER_ID, {
      callbackUrl: "/dashboard",
    });
  });
});
