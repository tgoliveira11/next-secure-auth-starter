import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPreferenceEtag, etagsMatch } from "../preference-etag.js";

describe("preference-etag", () => {
  it("builds etag from updatedAt timestamp", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    expect(buildPreferenceEtag(date)).toBe(`"${date.getTime()}"`);
  });

  it("matches etags including wildcard", () => {
    const etag = '"123"';
    expect(etagsMatch(etag, etag)).toBe(true);
    expect(etagsMatch(etag, "*")).toBe(true);
    expect(etagsMatch(etag, '"456"')).toBe(false);
  });
});
