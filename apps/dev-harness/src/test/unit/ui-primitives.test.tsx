/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ErrorState,
  SuccessState,
  Textarea,
  FormField,
  fieldDescribedBy,
  AppMark,
  EmptyState,
  PageHeader,
  Alert,
  Input,
  Button,
} from "@tgoliveira/secure-auth/react";

/** Smoke tests: starter can render package React exports (detailed UI tests live in the package). */
describe("UI primitives (package)", () => {
  it("renders ErrorState with message", () => {
    render(<ErrorState message="Unable to load sessions." />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Unable to load sessions.")).toBeTruthy();
  });

  it("renders SuccessState with message", () => {
    render(<SuccessState message="Saved" />);
    expect(screen.getByText("Saved")).toBeTruthy();
  });

  it("renders Textarea", () => {
    render(<Textarea id="notes" aria-label="Notes" />);
    expect(screen.getByLabelText("Notes")).toBeTruthy();
  });

  it("FormField wires describedBy ids", () => {
    expect(fieldDescribedBy("email", true, true)).toContain("email-error");
  });

  it("AppMark renders brand svg", () => {
    const { container } = render(<AppMark />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("EmptyState renders heading", () => {
    render(<EmptyState title="No sessions" description="Sign in elsewhere to see devices." />);
    expect(screen.getByText("No sessions")).toBeTruthy();
  });

  it("PageHeader renders title", () => {
    render(<PageHeader title="Security" />);
    expect(screen.getByRole("heading", { name: "Security" })).toBeTruthy();
  });

  it("Alert renders children", () => {
    render(<Alert variant="info">Heads up</Alert>);
    expect(screen.getByText("Heads up")).toBeTruthy();
  });

  it("Input renders text field", () => {
    render(<Input id="email" aria-label="Email" />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
  });

  it("Button renders from package react export", () => {
    render(<Button type="button">Continue</Button>);
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
  });
});
