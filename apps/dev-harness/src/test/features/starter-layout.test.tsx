/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Nav } from "@/components/layout/nav";
import { Providers } from "@/components/providers";
import { StarterShell } from "@/components/layout/starter-shell";
import { AuthPageLayout } from "@/components/layout/auth-page-layout";
import { RouteError } from "@/components/layout/route-error";
import { AuthDebugPanel } from "@/components/auth/auth-debug-panel";
import { starterTestUiConfig } from "@/test/helpers/starter-test-ui-config";

const push = vi.fn();
const signOutAccount = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push, replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/dashboard"),
  useSearchParams: vi.fn(() => new URLSearchParams("mode=credentials")),
}));

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: vi.fn(),
}));

vi.mock("@/lib/sign-out-account", () => ({
  signOutAccount: (...args: unknown[]) => signOutAccount(...args),
}));

describe("starter layout components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders guest navigation actions", async () => {
    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({ data: null, status: "unauthenticated" });

    render(<Nav />);
    expect(screen.getByRole("link", { name: /sign in/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /create account/i })).toBeTruthy();
  });

  it("renders authenticated navigation, mobile menu, and sign out", async () => {
    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: "user@example.com" } },
      status: "authenticated",
    });
    signOutAccount.mockResolvedValue(undefined);

    render(<Nav />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /dashboard/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: /sign out/i })[0]!);
    await waitFor(() => {
      expect(signOutAccount).toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith("/");
    });
  });

  it("wraps children with session and UI providers", () => {
    render(
      <Providers uiConfig={starterTestUiConfig}>
        <p>Child content</p>
      </Providers>
    );
    expect(screen.getByText("Child content")).toBeTruthy();
  });

  it("passes session refetch interval when revocation polling is enabled", () => {
    render(
      <Providers
        uiConfig={{
          ...starterTestUiConfig,
          sessionPolicy: {
            ...starterTestUiConfig.sessionPolicy,
            revocationPollIntervalSeconds: 30,
          },
        }}
      >
        <p>Polling child</p>
      </Providers>
    );
    expect(screen.getByText("Polling child")).toBeTruthy();
  });

  it("renders starter shell with navigation", async () => {
    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({ data: null, status: "unauthenticated" });

    render(
      <StarterShell>
        <p>Page body</p>
      </StarterShell>
    );
    expect(screen.getByText("Page body")).toBeTruthy();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeTruthy();
  });

  it("renders auth page layout without debug panel by default", () => {
    render(
      <AuthPageLayout>
        <p>Auth form</p>
      </AuthPageLayout>
    );
    expect(screen.getByText("Auth form")).toBeTruthy();
    expect(screen.queryByLabelText(/auth debug trace/i)).toBeNull();
  });

  it("renders auth page layout with debug panel when enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_DEBUG_TRACE", "true");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );

    render(
      <AuthPageLayout>
        <p>Auth form</p>
      </AuthPageLayout>
    );
    expect(screen.getByText("Auth form")).toBeTruthy();
  });

  it("renders route error with retry action", () => {
    const reset = vi.fn();
    render(<RouteError reset={reset} message="Unable to load settings." />);
    expect(screen.getByText("Unable to load settings.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalled();
  });

  it("renders auth debug panel when trace endpoints respond", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/login/trace")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              events: [{ at: "2026-01-01T12:00:00.000Z", step: "login:start" }],
            }),
          });
        }
        if (url.includes("/api/auth/login/challenge-status")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pending: true }),
          });
        }
        return Promise.resolve({ ok: false, json: async () => ({}) });
      })
    );

    render(<AuthDebugPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText(/auth debug trace/i)).toBeTruthy();
      expect(screen.getByText(/login:start/)).toBeTruthy();
      expect(screen.getByText(/present/)).toBeTruthy();
    });
  });

  it("ignores optional trace endpoint failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<AuthDebugPanel />);
    await waitFor(() => {
      expect(screen.queryByLabelText(/auth debug trace/i)).toBeNull();
    });
  });

  it("logs client trace steps when public debug tracing is enabled", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("NEXT_PUBLIC_AUTH_DEBUG_TRACE", "true");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );

    render(<AuthDebugPanel />);

    await waitFor(() => {
      expect(info).toHaveBeenCalledWith("[auth-trace:client]", expect.stringContaining("/dashboard"));
    });
    info.mockRestore();
  });
});
