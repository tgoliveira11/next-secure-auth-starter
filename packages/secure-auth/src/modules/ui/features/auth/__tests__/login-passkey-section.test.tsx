/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { LoginPasskeySection } from "../login-passkey-section.js";
import * as passkeyClient from "@tgoliveira/secure-auth/react/client";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

describe("LoginPasskeySection", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    mocks.push.mockReset();
    document.getElementById("login-credentials-form")?.remove();
  });

  it("uses an honest checking state before browser capability detection", () => {
    const html = renderToString(<LoginPasskeySection appSlug="test-app" />);
    expect(html).toContain("Checking passkey support…");
    expect(html).not.toContain("does not support passkey sign-in");
  });

  it("renders a verified supported state", async () => {
    vi.spyOn(passkeyClient, "isPasskeyLoginSupported").mockReturnValue(true);
    render(<LoginPasskeySection appSlug="test-app" />);

    const button = await screen.findByRole("button", { name: "Sign in with passkey" });
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(screen.queryByText(/not supported/i)).toBeNull();
  });

  it("renders verified unsupported copy only after capability detection", async () => {
    vi.spyOn(passkeyClient, "isPasskeyLoginSupported").mockReturnValue(false);
    render(<LoginPasskeySection appSlug="test-app" />);

    const button = await screen.findByRole("button", { name: "Sign in with passkey" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/does not support passkey sign-in/i)).toBeTruthy();
  });

  it("honors a typed post-login integration action redirect", async () => {
    vi.spyOn(passkeyClient, "isPasskeyLoginSupported").mockReturnValue(true);
    vi.spyOn(passkeyClient, "signInWithPasskey").mockResolvedValue({
      outcome: "signed-in-integration-action-required",
      redirectTo: "/unlock?reason=no-match",
      integration: {
        status: "action_required",
        code: "local_capability_no_match",
        redirectTo: "/unlock?reason=no-match",
      },
    });
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<form id="login-credentials-form"><input name="email" value="person@example.com"></form>'
    );
    render(<LoginPasskeySection appSlug="test-app" />);

    fireEvent.click(await screen.findByRole("button", { name: "Sign in with passkey" }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/unlock?reason=no-match"));
  });

  it("surfaces an integration failure instead of silently redirecting", async () => {
    vi.spyOn(passkeyClient, "isPasskeyLoginSupported").mockReturnValue(true);
    vi.spyOn(passkeyClient, "signInWithPasskey").mockResolvedValue({
      outcome: "signed-in-integration-failed",
      redirectTo: "/dashboard",
      integration: { status: "failed", error: new Error("internal detail") },
    });
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<form id="login-credentials-form"><input name="email" value="person@example.com"></form>'
    );
    render(<LoginPasskeySection appSlug="test-app" />);

    fireEvent.click(await screen.findByRole("button", { name: "Sign in with passkey" }));

    expect(
      await screen.findByText(
        "Sign-in succeeded, but an additional security step could not be completed."
      )
    ).toBeTruthy();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
