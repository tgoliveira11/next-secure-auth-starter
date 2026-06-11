/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PasskeySettings } from "@/components/settings/passkey-settings";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/api-client/passkey-account", () => ({
  passkeyAccountApi: {
    list: mocks.list,
    registerOptions: vi.fn(),
    registerVerify: vi.fn(),
    remove: mocks.remove,
  },
}));

describe("PasskeySettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({
      passkeys: [
        {
          id: "pk-1",
          friendlyName: "Laptop",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: null,
          signInEnabled: true,
        },
        {
          id: "pk-2",
          friendlyName: "Phone",
          createdAt: "2026-01-02T00:00:00.000Z",
          lastUsedAt: "2026-01-03T00:00:00.000Z",
          signInEnabled: true,
        },
      ],
    });
  });

  it("lists passkeys with account details", async () => {
    render(<PasskeySettings userId={USER_ID} />);
    await waitFor(() => {
      expect(screen.getByText("Laptop")).toBeTruthy();
      expect(screen.getByText("Phone")).toBeTruthy();
    });
  });

  it("shows passkey section title", async () => {
    render(<PasskeySettings userId={USER_ID} />);
    await waitFor(() => {
      expect(screen.getByText("Passkeys")).toBeTruthy();
    });
  });
});
