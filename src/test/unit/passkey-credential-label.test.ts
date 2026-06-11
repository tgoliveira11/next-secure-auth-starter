import { describe, it, expect } from "vitest";
import {
  getPasskeyCapabilityDisplay,
  getPasskeyCapabilityLabel,
} from "@/lib/passkey/credential-label";

describe("passkey credential labels", () => {
  it("describes account sign-in capability only", () => {
    expect(getPasskeyCapabilityLabel()).toBe("sign-in");
    expect(getPasskeyCapabilityDisplay()).toBe("Sign-in");
  });
});
