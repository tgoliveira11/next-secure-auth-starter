import { describe, it, expect } from "vitest";

const integrationUrl = process.env.INTEGRATION_DATABASE_URL?.trim();
const describeIntegration = integrationUrl ? describe : describe.skip;

/**
 * Live PostgreSQL checks — opt in with INTEGRATION_DATABASE_URL.
 * Local manual validation: docker compose up -d && INTEGRATION_DATABASE_URL=$DATABASE_URL npm run test -w @tgoliveira/secure-auth -- src/test/integration
 */
describeIntegration("PostgreSQL integration", () => {
  it("connects to the integration database", async () => {
    const postgres = (await import("postgres")).default;
    const sql = postgres(integrationUrl!, { max: 1 });
    const rows = await sql`select 1 as ok`;
    await sql.end({ timeout: 1 });
    expect(rows[0]?.ok).toBe(1);
  });
});
