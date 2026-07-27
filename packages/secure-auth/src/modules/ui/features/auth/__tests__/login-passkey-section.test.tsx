/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { LoginPasskeySection } from "../login-passkey-section.js";
import * as passkeyClient from "@tgoliveira/secure-auth/react/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("LoginPasskeySection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
