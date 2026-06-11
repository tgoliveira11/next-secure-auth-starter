/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PasswordStrengthField } from "@/components/auth/password-strength-field";
import type { PasswordPolicyConfig } from "@/lib/password-policy";

const warnPolicy: PasswordPolicyConfig = {
  enforcement: "warn",
  minLength: 12,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSymbol: false,
  blockCommonPasswords: true,
  minScore: 2,
};

describe("PasswordStrengthField", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows strength feedback when policy is warn mode", async () => {
    render(
      <PasswordStrengthField
        id="password"
        label="Password"
        value="Riverstone-Kettle-2026!"
        onChange={() => undefined}
        policyConfig={warnPolicy}
      />
    );

    expect(await screen.findByText(/Strength:/)).toBeTruthy();
    expect(screen.getByText("Strong")).toBeTruthy();
  });

  it("hides strength feedback when policy enforcement is off", async () => {
    render(
      <PasswordStrengthField
        id="password"
        label="Password"
        value="short"
        onChange={() => undefined}
        policyConfig={{ ...warnPolicy, enforcement: "off" }}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Strength:/)).toBeNull();
    });
  });

  it("loads policy from the public API when config is not provided", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(warnPolicy), { status: 200 })
    );

    render(
      <PasswordStrengthField
        id="password"
        label="Password"
        value="Riverstone-Kettle-2026!"
        onChange={() => undefined}
      />
    );

    expect(await screen.findByText(/Strength:/)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith("/api/auth/password-policy");
  });
});
