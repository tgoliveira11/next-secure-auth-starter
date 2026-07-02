import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPost as POST } from "@/test/helpers/handlers";
import { getTestServices } from "@/test/helpers/mock-services";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/modules/security/policies/password-hashing", () => ({
  hashPassword: vi.fn(
    async () => "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  ),
}));

let services: SecureAuthServices;

async function buildServices() {
  return getTestServices({}, (base) => ({
    repos: {
      ...base.repos,
      userRepository: {
        ...base.repos.userRepository,
        findByEmail: mocks.findByEmail,
        create: mocks.create,
      },
    },
  }));
}

describe("register route error mapping", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.findByEmail.mockResolvedValue(null);
    services = await buildServices();
  });

  it("maps database connection errors", async () => {
    mocks.create.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      }),
      services
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Registration failed. Please try again.",
    });
  });

  it("maps missing DATABASE_URL configuration", async () => {
    mocks.create.mockRejectedValue(new Error("DATABASE_URL is not set"));
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      }),
      services
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Registration failed. Please try again.",
    });
  });

  it("maps missing schema errors", async () => {
    mocks.create.mockRejectedValue(new Error('relation "users" does not exist'));
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      }),
      services
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Registration failed. Please try again.",
    });
  });

  it("rejects password in query string", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register?password=secret", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("rate limits registration attempts", async () => {
    for (let i = 0; i < 10; i++) {
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ email: `user${i}@example.com`, password: "password123" }),
        }),
        services
      );
    }
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "blocked@example.com", password: "password123" }),
      }),
      services
    );
    expect(res.status).toBe(429);
  });
});
