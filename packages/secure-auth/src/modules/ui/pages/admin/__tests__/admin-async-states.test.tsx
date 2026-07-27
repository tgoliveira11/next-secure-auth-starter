/** @vitest-environment happy-dom */
import type { ReactElement } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminApiKeysPage } from "../admin-api-keys-page.js";
import { AdminConfigPage } from "../admin-config-page.js";
import { AdminLocksPage } from "../admin-locks-page.js";
import { AdminWaitlistPage } from "../admin-waitlist-page.js";

type PageCase = {
  name: string;
  renderPage: () => ReactElement;
  loadingText: string;
  falseFinalText: string;
  emptyBody: unknown;
  emptyText: string;
  readyBody: unknown;
  readyText: string;
  errorText: string;
};

const pageCases: PageCase[] = [
  {
    name: "account locks",
    renderPage: () => <AdminLocksPage apiBase="/test-auth" />,
    loadingText: "Loading lock records…",
    falseFinalText: "No records",
    emptyBody: { locked: [], frozen: [] },
    emptyText: "No records",
    readyBody: {
      locked: [{
        id: "lock-1",
        email: "locked@example.com",
        userId: "user-1",
        attempts: 5,
        lastAttemptAt: "2026-07-27T12:00:00.000Z",
      }],
      frozen: [],
    },
    readyText: "locked@example.com",
    errorText: "Failed to load lock data. Please try again.",
  },
  {
    name: "API keys",
    renderPage: () => <AdminApiKeysPage apiBase="/test-auth" />,
    loadingText: "Loading API keys…",
    falseFinalText: "0 keys.",
    emptyBody: { keys: [] },
    emptyText: "No API keys",
    readyBody: {
      keys: [{
        id: "key-1",
        name: "Automation",
        keyPrefix: "sat_test",
        scopes: ["read:users"],
        createdAt: "2026-07-27T12:00:00.000Z",
      }],
    },
    readyText: "Automation",
    errorText: "Failed to load API keys.",
  },
  {
    name: "config overrides",
    renderPage: () => <AdminConfigPage apiBase="/test-auth" />,
    loadingText: "Loading config…",
    falseFinalText: "No configurable settings",
    emptyBody: { keys: [] },
    emptyText: "No configurable settings",
    readyBody: {
      keys: [{ key: "registration.enabled", source: "default", value: true }],
    },
    readyText: "registration.enabled",
    errorText: "Failed to load config overrides.",
  },
  {
    name: "waitlist",
    renderPage: () => <AdminWaitlistPage apiBase="/test-auth" />,
    loadingText: "Loading waitlist…",
    falseFinalText: "0 accounts pending approval.",
    emptyBody: { users: [], total: 0 },
    emptyText: "Waitlist is empty",
    readyBody: {
      users: [{
        id: "user-1",
        email: "pending@example.com",
        createdAt: "2026-07-27T12:00:00.000Z",
      }],
      total: 1,
    },
    readyText: "pending@example.com",
    errorText: "Failed to load waitlist.",
  },
];

function response(body: unknown, ok = true): Response {
  return { ok, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

afterEach(() => {
  cleanup();
});

describe.each(pageCases)("$name async state", (page) => {
  it("paints a pending state without false final data on the first frame", () => {
    vi.mocked(global.fetch).mockReturnValue(new Promise<Response>(() => undefined));

    render(page.renderPage());

    expect(screen.getByText(page.loadingText)).toBeTruthy();
    expect(screen.queryAllByText(page.falseFinalText)).toHaveLength(0);
  });

  it("renders the explicit ready-empty state after an empty response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(response(page.emptyBody));

    render(page.renderPage());

    await waitFor(() => {
      expect(screen.queryAllByText(page.emptyText).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(page.loadingText)).toBeNull();
  });

  it("renders resolved records only after a successful response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(response(page.readyBody));

    render(page.renderPage());

    expect(await screen.findByText(page.readyText)).toBeTruthy();
    expect(screen.queryByText(page.loadingText)).toBeNull();
  });

  it("renders an error state without falling through to empty or stale content", async () => {
    vi.mocked(global.fetch).mockResolvedValue(response({}, false));

    render(page.renderPage());

    expect(await screen.findByText(page.errorText)).toBeTruthy();
    expect(screen.queryAllByText(page.emptyText)).toHaveLength(0);
    expect(screen.queryAllByText(page.readyText)).toHaveLength(0);
  });
});
