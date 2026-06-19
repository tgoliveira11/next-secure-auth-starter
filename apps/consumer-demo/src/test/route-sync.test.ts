import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

describe("consumer-demo route sync", () => {
  it("is in sync with the package route registry (run sync:consumer-demo to fix)", () => {
    const result = spawnSync(
      "node",
      [join(process.cwd(), "../../scripts/sync-consumer-demo-routes.mjs"), "--check"],
      { encoding: "utf-8" }
    );

    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
