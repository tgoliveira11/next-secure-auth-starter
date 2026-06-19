/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PasskeySettings } from "@/components/settings/passkey-settings";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@tgoliveira/secure-auth/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/secure-auth/client")>();
  return {
    ...actual,
    passkeyAccountApi: {
      list: mocks.list,
      registerOptions: vi.fn(),
      registerVerify: vi.fn(),
      remove: mocks.remove,
    },
  };
});

const signInPasskey = {
  id: "pk-1",
  friendlyName: "Laptop",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastUsedAt: null,
  signInEnabled: true,
  vaultUnlockEnabled: false,
  capabilities: { signIn: true, vaultUnlock: false },
  removableFromAccountSettings: true,
  label: "Laptop",
  description: "Sign in without a password using this passkey.",
  badge: "Sign-in",
};

const vaultOnlyPasskey = {
  id: "pk-vault",
  friendlyName: "Vault passkey",
  createdAt: "2026-01-02T00:00:00.000Z",
  lastUsedAt: null,
  signInEnabled: false,
  vaultUnlockEnabled: true,
  capabilities: { signIn: false, vaultUnlock: true },
  removableFromAccountSettings: false,
  label: "Vault passkey",
  description:
    "This passkey is used for vault unlock and cannot be removed from account security settings. Manage it from Vault settings.",
  badge: "Vault unlock only",
};

describe("PasskeySettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({
      passkeys: [signInPasskey, vaultOnlyPasskey],
    });
  });

  it("lists passkeys with capability metadata", async () => {
    render(<PasskeySettings userId={USER_ID} appSlug="test-app" />);
    await waitFor(() => {
      expect(screen.getByText("Laptop")).toBeTruthy();
      expect(screen.getByText("Vault passkey")).toBeTruthy();
      expect(screen.getByText("Vault unlock only")).toBeTruthy();
    });
  });

  it("shows remove button only for removable account sign-in passkeys", async () => {
    render(<PasskeySettings userId={USER_ID} appSlug="test-app" />);
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^remove$/i })).toHaveLength(1);
    });
  });

  it("does not use account sign-in copy for vault-only passkeys", async () => {
    render(<PasskeySettings userId={USER_ID} appSlug="test-app" />);
    await waitFor(() => {
      expect(screen.getByText(/Manage it from Vault settings/i)).toBeTruthy();
    });
    const vaultCard = screen.getByText("Vault passkey").closest("li");
    expect(vaultCard?.textContent).not.toContain("Sign in without a password using this passkey.");
  });

  it("shows passkey section title", async () => {
    render(<PasskeySettings userId={USER_ID} appSlug="test-app" />);
    await waitFor(() => {
      expect(screen.getByText("Passkeys")).toBeTruthy();
    });
  });
});
