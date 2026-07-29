/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TwoFactorSettings } from "../two-factor-settings.js";

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
}));

vi.mock("@tgoliveira/secure-auth/client", () => ({
  twoFactorApi: {
    status: mocks.status,
  },
}));

describe("TwoFactorSettings", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("describes TOTP as required after every supported primary sign-in method", async () => {
    mocks.status.mockResolvedValue({ enabled: true });

    render(<TwoFactorSettings appSlug="test-app" />);

    expect(
      await screen.findByText(
        /requires a one-time code after signing in with email and password, a passkey, or OAuth/i
      )
    ).toBeTruthy();
    expect(screen.getByText(/separate from vault unlock/i)).toBeTruthy();
    expect(screen.queryByText(/passkeys.*do not require a separate one-time code/i)).toBeNull();
  });
});
