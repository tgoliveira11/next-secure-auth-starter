import { describe, it, expect } from "vitest";
import {
  getPasskeyCapabilityDisplay,
  getPasskeyCapabilityLabel,
} from "@tgoliveira/secure-auth/client";

describe("passkey credential labels", () => {
  it("describes account sign-in capability only", () => {
    expect(getPasskeyCapabilityLabel()).toBe("sign-in");
    expect(getPasskeyCapabilityDisplay()).toBe("Sign-in");
  });
});
