import { describe, it, expect } from "vitest";
import { createRoutes } from "@/server/routes/create-routes";
import { SECURE_AUTH_PACKAGE_VERSION } from "@/core/package-version";
import type { SecureAuthServices } from "@/core/types";

function mockDb(selectImpl?: () => Promise<unknown>) {
  return {
    select: () => ({
      from: () => ({
        limit: selectImpl ?? (async () => []),
      }),
    }),
  };
}

function mockServices(db: ReturnType<typeof mockDb>): SecureAuthServices {
  return { db } as unknown as SecureAuthServices;
}

describe("health route", () => {
  it("reports package version and database readiness when schema is valid", async () => {
    const routes = createRoutes(async () => mockServices(mockDb()));
    const response = await routes.health.GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      package: "@tgoliveira/secure-auth",
      version: SECURE_AUTH_PACKAGE_VERSION,
      database: { ready: true },
    });
  });

  it("reports schema migration hints when users columns are missing", async () => {
    const routes = createRoutes(async () =>
      mockServices(
        mockDb(async () => {
          throw new Error('Failed query: select "status" from "users" | column "status" does not exist');
        })
      )
    );

    const response = await routes.health.GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      package: "@tgoliveira/secure-auth",
      version: SECURE_AUTH_PACKAGE_VERSION,
      database: {
        ready: false,
        error: expect.stringContaining("0002_v0_3_admin_platform.sql"),
      },
    });
  });
});
