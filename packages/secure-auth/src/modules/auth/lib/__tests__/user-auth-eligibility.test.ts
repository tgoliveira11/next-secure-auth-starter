import { describe, it, expect } from "vitest";
import { assertUserMayAuthenticate, AccountNotActiveError } from "../user-auth-eligibility";

describe("assertUserMayAuthenticate", () => {
  it("allows active users", () => {
    expect(() => assertUserMayAuthenticate({ status: "active" })).not.toThrow();
  });

  it("rejects suspended users", () => {
    expect(() => assertUserMayAuthenticate({ status: "suspended" })).toThrow(AccountNotActiveError);
  });

  it("rejects pending users", () => {
    expect(() => assertUserMayAuthenticate({ status: "pending" })).toThrow(AccountNotActiveError);
  });
});
