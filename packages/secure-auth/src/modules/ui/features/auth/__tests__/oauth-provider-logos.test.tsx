/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { OAuthProviderLogo } from "../oauth-provider-logos.js";

describe("OAuthProviderLogo", () => {
  it("renders GitHub logo for github provider id", () => {
    const { container } = render(<OAuthProviderLogo providerId="github" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
