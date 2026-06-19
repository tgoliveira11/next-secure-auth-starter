import { describe, it, expect, vi } from "vitest";

const createNextAuthRouteHandlers = vi.fn(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({})),
}));

vi.mock("@tgoliveira/secure-auth/next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/secure-auth/next")>();
  return {
    ...actual,
    createNextAuthRouteHandlers,
  };
});

describe("nextauth route wiring", () => {
  it("creates NextAuth route handlers from secureAuth services", async () => {
    const routeModule = await import("@/lib/nextauth-route");
    expect(createNextAuthRouteHandlers).toHaveBeenCalled();
    expect(routeModule.GET).toBeTypeOf("function");
    expect(routeModule.POST).toBeTypeOf("function");
  });
});
