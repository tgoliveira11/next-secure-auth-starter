/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SocialSignIn } from "../social-sign-in.js";

describe("SocialSignIn", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ github: { id: "github", name: "GitHub" } }),
      })
    );
  });

  afterEach(() => {
    vi.stubGlobal("fetch", originalFetch);
  });

  it("renders GitHub when configured in NextAuth providers", async () => {
    render(<SocialSignIn />);
    expect(await screen.findByRole("button", { name: /continue with github/i })).toBeTruthy();
  });

  it("does not render GitHub when provider is absent", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ google: { id: "google", name: "Google" } }),
    } as Response);

    render(<SocialSignIn />);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /continue with github/i })).toBeNull();
    });
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeTruthy();
  });
});
