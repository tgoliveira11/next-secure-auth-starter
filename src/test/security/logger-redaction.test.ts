import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { safeLogger } from "@/lib/logger";

describe("safe logger redaction", () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
    vi.spyOn(console, "error").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts passwords and tokens from logs", () => {
    safeLogger.info("test event", {
      password: "secret-password",
      loginToken: "opaque-token",
      endpoint: "/api/account",
    });

    const output = logs.join(" ");
    expect(output).not.toContain("secret-password");
    expect(output).not.toContain("opaque-token");
    expect(output).toContain("[REDACTED]");
    expect(output).toContain("/api/account");
  });

  it("redacts backup codes", () => {
    safeLogger.error("2fa failed", { backupCode: "ABCD-1234" });
    const output = logs.join(" ");
    expect(output).not.toContain("ABCD-1234");
    expect(output).toContain("[REDACTED]");
  });
});
