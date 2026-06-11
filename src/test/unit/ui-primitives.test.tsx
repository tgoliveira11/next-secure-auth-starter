/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "@/modules/ui/primitives/error-state";
import { SuccessState } from "@/modules/ui/primitives/success-state";
import { Textarea } from "@/modules/ui/primitives/textarea";
import { FormField, fieldDescribedBy } from "@/modules/ui/primitives/form-field";
import { ConfirmDialog } from "@/modules/ui/primitives/confirm-dialog";
import { AppMark } from "@/modules/ui/primitives/app-mark";
import { EmptyState } from "@/modules/ui/primitives/empty-state";
import { PageHeader } from "@/modules/ui/primitives/page-header";
import { Alert } from "@/modules/ui/primitives/alert";
import { Input } from "@/modules/ui/primitives/input";

describe("UI primitives", () => {
  it("renders error state with optional retry", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorState message="Network failed" />);
    expect(screen.getByRole("alert").textContent).toContain("Network failed");
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();

    rerender(<ErrorState message="Network failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders success state", () => {
    render(<SuccessState message="Saved" />);
    expect(screen.getByRole("status").textContent).toContain("Saved");
  });

  it("renders textarea with custom class", () => {
    render(<Textarea aria-label="Notes" className="custom" />);
    const textarea = screen.getByLabelText("Notes");
    expect(textarea.className).toContain("custom");
  });

  it("renders form field hint and error states", () => {
    const { rerender } = render(
      <FormField id="email" label="Email" hint="Use your work email">
        <Input id="email" />
      </FormField>
    );
    expect(screen.getByText("Use your work email")).toBeTruthy();

    rerender(
      <FormField id="email" label="Email" hint="Use your work email" error="Invalid email">
        <Input id="email" />
      </FormField>
    );
    expect(screen.queryByText("Use your work email")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Invalid email");
  });

  it("builds described-by ids for accessibility helpers", () => {
    expect(fieldDescribedBy("field")).toBeUndefined();
    expect(fieldDescribedBy("field", "hint")).toBe("field-hint");
    expect(fieldDescribedBy("field", undefined, "error")).toBe("field-error");
    expect(fieldDescribedBy("field", "hint", "error")).toBe("field-hint field-error");
  });

  it("renders confirm dialog with escape handling and loading state", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Revoke session"
        description="Sign out this browser?"
        confirmLabel="Revoke"
        variant="primary"
        loading
        onCancel={onCancel}
        onConfirm={onConfirm}
      >
        <p>Extra context</p>
      </ConfirmDialog>
    );

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("Extra context")).toBeTruthy();
    expect(screen.getByRole("button", { name: /please wait/i }).hasAttribute("disabled")).toBe(
      true
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("renders app mark and empty state variants", () => {
    render(
      <>
        <AppMark size={20} className="brand" />
        <EmptyState
          title="No sessions"
          description="You are signed out everywhere."
          action={<button type="button">Refresh</button>}
        />
        <Alert variant="warning" title="Heads up">
          Check your email.
        </Alert>
      </>
    );
    expect(screen.getByText("No sessions")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
    expect(screen.getByText("Check your email.")).toBeTruthy();
  });

  it("renders page headers with and without descriptions", () => {
    const { rerender } = render(<PageHeader title="Security" />);
    expect(screen.getByRole("heading", { name: "Security" })).toBeTruthy();
    expect(screen.queryByText("Optional copy")).toBeNull();

    rerender(<PageHeader title="Security" description="Optional copy" />);
    expect(screen.getByText("Optional copy")).toBeTruthy();

    rerender(
      <PageHeader title="Security" action={<button type="button">Add passkey</button>} />
    );
    expect(screen.getByRole("button", { name: "Add passkey" })).toBeTruthy();
  });
});
