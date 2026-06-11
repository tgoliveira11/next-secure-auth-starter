import { describe, it, expect } from "vitest";
import {
  prepareAuthenticationOptions,
  prepareRegistrationOptions,
} from "@/lib/passkey/prepare-webauthn-options";

describe("prepareWebAuthnOptions", () => {
  it("returns registration options unchanged", () => {
    const options = { challenge: "abc", rp: { name: "Test", id: "localhost" } };
    expect(prepareRegistrationOptions(options as never)).toEqual(options);
  });

  it("returns authentication options unchanged", () => {
    const options = { challenge: "abc" };
    expect(prepareAuthenticationOptions(options as never)).toEqual(options);
  });
});
