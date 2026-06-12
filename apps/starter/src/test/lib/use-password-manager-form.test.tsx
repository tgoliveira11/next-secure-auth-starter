/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { usePasswordManagerFormSubmit } from "@tgoliveira/secure-auth/react/client";

function TestForm({ onSubmit }: { onSubmit: () => void }) {
  const formRef = usePasswordManagerFormSubmit<HTMLFormElement>();

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <button type="submit">Submit</button>
    </form>
  );
}

describe("usePasswordManagerFormSubmit", () => {
  it("routes programmatic submit() through requestSubmit()", () => {
    const onSubmit = vi.fn();
    const { container } = render(<TestForm onSubmit={onSubmit} />);
    const form = container.querySelector("form") as HTMLFormElement;

    form.submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
