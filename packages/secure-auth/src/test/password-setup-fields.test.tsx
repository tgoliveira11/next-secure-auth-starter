/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { PasswordSetupFields } from "@/modules/ui/features/password/password-setup-fields";

const policy = {
  enforcement: "enforce" as const,
  minLength: 12,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSymbol: false,
  blockCommonPasswords: true,
  minScore: 2,
};

describe("PasswordSetupFields", () => {
  it("renders password and confirmation fields", () => {
    render(
      <PasswordSetupFields
        passwordLabel="Vault password"
        confirmLabel="Confirm vault password"
        policy={policy}
      />
    );

    expect(screen.getByLabelText("Vault password")).toBeTruthy();
    expect(screen.getByLabelText("Confirm vault password")).toBeTruthy();
  });

  it("reports mismatch through onValidityChange", () => {
    const onValidityChange = vi.fn();

    render(
      <PasswordSetupFields
        policy={policy}
        onValidityChange={onValidityChange}
        value="Riverstone-Kettle-2026!"
        confirmValue="Mismatch"
      />
    );

    expect(onValidityChange).toHaveBeenCalled();
    const lastCall = onValidityChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(false);
    expect(lastCall?.[1].confirmation.matches).toBe(false);
  });

  it("keeps password input mounted while typing", () => {
    function Controlled() {
      const [password, setPassword] = useState("");
      return (
        <PasswordSetupFields
          policy={policy}
          value={password}
          onChange={setPassword}
          confirmValue=""
        />
      );
    }

    render(<Controlled />);
    const inputBefore = screen.getByLabelText("Password");
    inputBefore.focus();
    fireEvent.change(inputBefore, { target: { value: "abc" } });
    const inputAfter = screen.getByLabelText("Password");

    expect(inputAfter).toBe(inputBefore);
    expect(document.activeElement).toBe(inputAfter);
  });

  it("hides confirmation when requireConfirmation is false", () => {
    render(<PasswordSetupFields policy={policy} requireConfirmation={false} />);
    expect(screen.queryByLabelText("Confirm password")).toBeNull();
  });
});
