/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChangePasswordSettings } from "@/components/settings/change-password-settings";

describe("ChangePasswordSettings", () => {
  it("hides password form for Microsoft-only accounts", () => {
    render(<ChangePasswordSettings canChangePassword={false} authProvider="azure-ad" />);
    const message = screen.getByText(/password change is not available/i);
    expect(message.textContent).toMatch(/google/i);
    expect(message.textContent).toMatch(/github/i);
    expect(message.textContent).toMatch(/microsoft/i);
    expect(screen.queryByLabelText("Current password")).toBeNull();
  });
});
