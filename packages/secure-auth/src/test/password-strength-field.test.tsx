/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useState } from "react";
import {
  PasswordStrengthField,
  PasswordFieldFeedbackPlacement,
  PasswordFeedbackSlot,
  SecureAuthUIProvider,
  DEFAULT_AUTH_PATHS,
  type SecureAuthUIPublicConfig,
} from "@tgoliveira/secure-auth/react";
import type { PasswordPolicyConfig } from "@tgoliveira/secure-auth/client/password-policy";

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

const baseUiConfig: SecureAuthUIPublicConfig = {
  appSlug: "test-app",
  appName: "Test App",
  paths: DEFAULT_AUTH_PATHS,
  messages: {},
  passwordPolicy: warnPolicy,
  passwordStrength: { position: "above" },
  sessionPolicy: {
    singleActiveSession: false,
    revocationPollIntervalSeconds: 0,
  },
};

function strengthIsBeforeInput() {
  const input = screen.getByLabelText("Password");
  const strength = screen.getByText(/Strength:/);
  expect(
    strength.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
}

function strengthIsAfterInput() {
  const input = screen.getByLabelText("Password");
  const strength = screen.getByText(/Strength:/);
  expect(
    input.compareDocumentPosition(strength) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
}

function ControlledPasswordField({
  policyConfig = warnPolicy,
  passwordStrengthPosition,
  showStrength = true,
  confirmValue,
}: {
  policyConfig?: PasswordPolicyConfig;
  passwordStrengthPosition?: "above" | "below";
  showStrength?: boolean;
  confirmValue?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <PasswordStrengthField
      id="password"
      label="Password"
      value={value}
      onChange={setValue}
      policyConfig={policyConfig}
      passwordStrengthPosition={passwordStrengthPosition}
      showStrength={showStrength}
      confirmValue={confirmValue}
    />
  );
}

describe("PasswordFieldFeedbackPlacement", () => {
  it("renders feedback above the input when position is above", () => {
    render(
      <PasswordFieldFeedbackPlacement
        position="above"
        enabled
        input={<input data-testid="password-input" aria-label="Password" />}
        feedback={<p data-testid="feedback">Strength: Strong</p>}
      />
    );

    const input = screen.getByTestId("password-input");
    const feedback = screen.getByTestId("feedback");
    expect(
      feedback.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders feedback below the input when position is below", () => {
    render(
      <PasswordFieldFeedbackPlacement
        position="below"
        enabled
        input={<input data-testid="password-input" aria-label="Password" />}
        feedback={<p data-testid="feedback">Strength: Strong</p>}
      />
    );

    const input = screen.getByTestId("password-input");
    const feedback = screen.getByTestId("feedback");
    expect(
      input.compareDocumentPosition(feedback) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("keeps the input mounted when enabled with empty feedback content", () => {
    render(
      <PasswordFieldFeedbackPlacement
        position="above"
        enabled
        input={<input data-testid="password-input" aria-label="Password" />}
        feedback={null}
      />
    );

    expect(screen.getByTestId("password-input")).toBeTruthy();
    expect(document.querySelector(".password-field-stack")).toBeTruthy();
  });

  it("renders only the input when disabled", () => {
    render(
      <PasswordFieldFeedbackPlacement
        position="above"
        enabled={false}
        input={<input data-testid="password-input" aria-label="Password" />}
        feedback={<p data-testid="feedback">Strength: Strong</p>}
      />
    );

    expect(screen.getByTestId("password-input")).toBeTruthy();
    expect(screen.queryByTestId("feedback")).toBeNull();
    expect(document.querySelector(".password-field-stack")).toBeNull();
  });
});

describe("PasswordFeedbackSlot", () => {
  it("always renders its container for stable layout", () => {
    render(
      <PasswordFeedbackSlot id="password-password-feedback">
        <p>At least 12 characters.</p>
      </PasswordFeedbackSlot>
    );

    expect(document.getElementById("password-password-feedback")).toBeTruthy();
  });
});

describe("PasswordStrengthField", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows neutral guidance before typing when position is above", () => {
    render(
      <PasswordStrengthField
        id="password"
        label="Password"
        value=""
        onChange={() => undefined}
        policyConfig={warnPolicy}
        passwordStrengthPosition="above"
      />
    );

    const input = screen.getByLabelText("Password");
    const guidance = screen.getByText(/At least 12 characters/);
    expect(
      guidance.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByText(/Strength:/)).toBeNull();
  });

  it("renders strength feedback above the password input by default", async () => {
    render(
      <PasswordStrengthField
        id="password"
        label="Password"
        value="Riverstone-Kettle-2026!"
        onChange={() => undefined}
        policyConfig={warnPolicy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Strength:/)).toBeTruthy();
    });
    strengthIsBeforeInput();
  });

  it("renders strength feedback below when provider config sets position below", async () => {
    render(
      <SecureAuthUIProvider config={{ ...baseUiConfig, passwordStrength: { position: "below" } }}>
        <PasswordStrengthField
          id="password"
          label="Password"
          value="Riverstone-Kettle-2026!"
          onChange={() => undefined}
          policyConfig={warnPolicy}
        />
      </SecureAuthUIProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Strength:/)).toBeTruthy();
    });
    strengthIsAfterInput();
  });

  it("prop override wins over provider config", async () => {
    render(
      <SecureAuthUIProvider config={{ ...baseUiConfig, passwordStrength: { position: "below" } }}>
        <PasswordStrengthField
          id="password"
          label="Password"
          value="Riverstone-Kettle-2026!"
          onChange={() => undefined}
          policyConfig={warnPolicy}
          passwordStrengthPosition="above"
        />
      </SecureAuthUIProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Strength:/)).toBeTruthy();
    });
    strengthIsBeforeInput();
  });

  it("does not duplicate strength feedback", async () => {
    render(
      <PasswordStrengthField
        id="password"
        label="Password"
        value="Riverstone-Kettle-2026!"
        onChange={() => undefined}
        policyConfig={warnPolicy}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Strength:/)).toHaveLength(1);
    });
  });

  it("links password input to feedback via aria-describedby when feedback slot is enabled", () => {
    render(
      <PasswordStrengthField
        id="password"
        label="Password"
        value=""
        onChange={() => undefined}
        policyConfig={warnPolicy}
        hint="At least 12 characters"
      />
    );

    const input = screen.getByLabelText("Password");
    expect(input.getAttribute("aria-describedby")).toContain("password-password-feedback");
  });

  it("keeps focus when feedback updates after typing (above)", async () => {
    render(<ControlledPasswordField passwordStrengthPosition="above" />);

    const input = screen.getByLabelText("Password") as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: "abc" } });

    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("abc");
    expect(screen.getByText(/Strength:/)).toBeTruthy();
  });

  it("keeps focus when feedback updates after typing (below)", async () => {
    render(
      <SecureAuthUIProvider config={{ ...baseUiConfig, passwordStrength: { position: "below" } }}>
        <ControlledPasswordField />
      </SecureAuthUIProvider>
    );

    const input = screen.getByLabelText("Password") as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: "abc" } });

    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("abc");
    expect(screen.getByText(/Strength:/)).toBeTruthy();
    strengthIsAfterInput();
  });

  it("does not remount the password input when feedback appears", () => {
    render(<ControlledPasswordField passwordStrengthPosition="above" />);

    const inputBefore = screen.getByLabelText("Password");
    fireEvent.change(inputBefore, { target: { value: "abc" } });
    const inputAfter = screen.getByLabelText("Password");

    expect(inputAfter).toBe(inputBefore);
    expect(screen.getByText(/Strength:/)).toBeTruthy();
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
    expect(document.querySelector(".password-field-stack")).toBeNull();
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
