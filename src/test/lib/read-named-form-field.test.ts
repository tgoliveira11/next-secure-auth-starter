/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { readNamedFormField } from "@/lib/forms/read-named-form-field";

describe("readNamedFormField", () => {
  it("reads values from FormData on submit", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "email";
    input.value = "user@example.com";
    form.appendChild(input);

    expect(readNamedFormField(form, "email")).toBe("user@example.com");
  });

  it("falls back to named input when FormData is empty", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "password";
    input.value = "secret";
    form.appendChild(input);

    expect(readNamedFormField(form, "password", "")).toBe("secret");
  });

  it("returns fallback when field is missing or empty", () => {
    const form = document.createElement("form");
    expect(readNamedFormField(form, "missing", "fallback")).toBe("fallback");
  });
});
