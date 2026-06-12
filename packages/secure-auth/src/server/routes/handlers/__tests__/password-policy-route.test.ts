import { describe, it, expect } from "vitest";
import { passwordPolicyGet as GET } from "@/test/helpers/handlers";

describe("password policy API route", () => {
  it("returns public password policy config", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      enforcement: expect.stringMatching(/^(off|warn|enforce)$/),
      minLength: expect.any(Number),
    });
  });
});