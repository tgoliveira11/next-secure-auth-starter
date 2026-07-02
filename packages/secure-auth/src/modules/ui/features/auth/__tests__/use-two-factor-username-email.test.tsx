/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTwoFactorUsernameEmail } from "@/modules/ui/features/auth/use-two-factor-username-email";

const useSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => useSession(),
}));

vi.mock("@/lib/api-client/two-factor.js", () => ({
  authLoginApi: {
    challengeStatus: vi.fn(),
  },
}));

import { authLoginApi } from "@/lib/api-client/two-factor.js";

const challengeStatusMock = vi.mocked(authLoginApi.challengeStatus);

describe("useTwoFactorUsernameEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({ status: "unauthenticated", data: null });
  });

  it("uses initialUsernameEmail immediately for credentials mode", () => {
    const { result } = renderHook(() =>
      useTwoFactorUsernameEmail("credentials", "user@example.com")
    );

    expect(result.current).toEqual({
      email: "user@example.com",
      isReady: true,
    });
    expect(challengeStatusMock).not.toHaveBeenCalled();
  });

  it("uses initialUsernameEmail immediately for oauth mode", () => {
    useSession.mockReturnValue({ status: "loading", data: null });
    const { result } = renderHook(() =>
      useTwoFactorUsernameEmail("oauth", "user@example.com")
    );

    expect(result.current).toEqual({
      email: "user@example.com",
      isReady: true,
    });
  });

  it("loads credentials email from challenge status when no initial value is provided", async () => {
    challengeStatusMock.mockResolvedValue({
      pending: true,
      email: "user@example.com",
    });

    const { result } = renderHook(() => useTwoFactorUsernameEmail("credentials"));

    expect(result.current.isReady).toBe(false);

    await waitFor(() => {
      expect(result.current).toEqual({
        email: "user@example.com",
        isReady: true,
      });
    });
  });

  it("waits for oauth session when no initial value is provided", () => {
    useSession.mockReturnValue({ status: "loading", data: null });
    const { result } = renderHook(() => useTwoFactorUsernameEmail("oauth"));

    expect(result.current).toEqual({
      email: undefined,
      isReady: false,
    });
  });
});
