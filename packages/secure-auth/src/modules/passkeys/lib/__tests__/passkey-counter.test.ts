import { describe, expect, it } from "vitest";
import {
  MAX_WEBAUTHN_SIGNATURE_COUNTER,
  resolvePasskeyCounterAdvance,
} from "../passkey-counter";

describe("passkey counter advance policy", () => {
  it("advances a strictly increasing signature counter", () => {
    expect(resolvePasskeyCounterAdvance("7", 8)).toEqual({
      status: "advance",
      expectedCounter: "7",
      nextCounter: "8",
    });
  });

  it("allows 0 -> 0 only as a counterless compare-and-set", () => {
    expect(resolvePasskeyCounterAdvance("0", 0)).toEqual({
      status: "counterless",
      expectedCounter: "0",
      nextCounter: "0",
    });
  });

  it.each([
    ["8", 8],
    ["8", 7],
  ])("rejects a non-advancing counter %s -> %d", (stored, next) => {
    expect(resolvePasskeyCounterAdvance(stored, next)).toEqual({
      status: "invalid",
      reason: "counter_not_advanced",
    });
  });

  it.each(["", "01", "-1", "1.5", "not-a-counter"])(
    "rejects malformed persisted counter %s",
    (stored) => {
      expect(resolvePasskeyCounterAdvance(stored, 2)).toEqual({
        status: "invalid",
        reason: "invalid_stored_counter",
      });
    }
  );

  it.each([-1, 1.5, Number.NaN, MAX_WEBAUTHN_SIGNATURE_COUNTER + 1])(
    "rejects malformed new counter %s",
    (next) => {
      expect(resolvePasskeyCounterAdvance("0", next)).toEqual({
        status: "invalid",
        reason: "invalid_new_counter",
      });
    }
  );
});
