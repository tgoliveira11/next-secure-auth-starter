import { describe, it, expect, vi, beforeEach } from "vitest";
import { mergeGuestPreferences } from "../merge-guest-preferences.js";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/api-client/preferences.js", () => ({
  preferencesApi: {
    list: mocks.list,
    patch: mocks.patch,
  },
}));

describe("mergeGuestPreferences", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    mocks.list.mockResolvedValue({ namespace: "demo-app", entries: {}, etags: {} });
    mocks.patch.mockResolvedValue({ namespace: "demo-app", updated: ["theme"], etags: {} });
  });

  const idempotencyStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  } as Storage;

  it("merges only missing server keys with local-wins-if-server-empty", async () => {
    mocks.list.mockResolvedValue({
      namespace: "demo-app",
      entries: { theme: "dark" },
      etags: { theme: '"1"' },
    });

    const result = await mergeGuestPreferences({
      userId: "user-1",
      storageKey: "guest",
      readLocal: () => ({ theme: "light", sidebar: true }),
      mapLocalToEntries: (local) => local as Record<string, unknown>,
      idempotencyStorage,
    });

    expect(result.skipped).toContain("theme");
    expect(result.merged).toContain("sidebar");
    expect(mocks.patch).toHaveBeenCalledWith({ sidebar: true }, undefined);
  });

  it("skips when already merged in session", async () => {
    storage.set("secure-auth:prefs-merged:user-1", "1");
    const result = await mergeGuestPreferences({
      userId: "user-1",
      storageKey: "guest",
      readLocal: () => ({ theme: "light" }),
      mapLocalToEntries: (local) => local as Record<string, unknown>,
      idempotencyStorage,
    });
    expect(result.reason).toBe("already-merged");
    expect(mocks.patch).not.toHaveBeenCalled();
  });
});
