/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginCredentialsError } from "@/components/auth/login-credentials-error";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("error=invalid_credentials"),
}));

describe("LoginCredentialsError", () => {
  it("shows mapped query-string errors", () => {
    render(<LoginCredentialsError />);
    expect(screen.getByRole("alert").textContent).toContain("Invalid email or password");
  });

  it("prefers an explicit message over query-string errors", () => {
    render(<LoginCredentialsError message="Custom error" />);
    expect(screen.getByRole("alert").textContent).toContain("Custom error");
  });
});
