import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
// @ts-expect-error The release helper is an intentionally uncompiled Node.js module.
import { bumpVersion, extractUnreleased, inferReleaseBump, prepareRelease, releaseChangelog, resolveReleaseVersion } from "../../../../scripts/prepare-release.mjs";

const changelog = `# Changelog

## [Unreleased]

### Added

- New public feature.

### Changed

- **Breaking:** Changed a public signature.

## [0.1.22-internal] - 2026-06-18

- Previous release.
`;

describe("release preparation", () => {
  it("infers SemVer bumps and migrates legacy internal versions", () => {
    const unreleased = extractUnreleased(changelog);
    expect(inferReleaseBump("0.1.22-internal", unreleased)).toBe("minor");
    expect(inferReleaseBump("1.2.3", unreleased)).toBe("major");
    expect(inferReleaseBump("1.2.3", "### Added\n\n- Feature")).toBe("minor");
    expect(inferReleaseBump("1.2.3", "### Fixed\n\n- Fix")).toBe("patch");
    expect(bumpVersion("0.1.22-internal", "patch")).toBe("0.1.23");
  });

  it("supports explicit bump names and exact stable versions", () => {
    expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0");
    expect(resolveReleaseVersion("0.1.22-internal", "0.2.0", "changes")).toBe("0.2.0");
    expect(() => resolveReleaseVersion("0.1.22-internal", "0.1.22", "changes")).toThrow(/greater/);
    expect(() => resolveReleaseVersion("0.1.22-internal", "0.2.0-beta.1", "changes")).toThrow(/SemVer/);
  });

  it("moves Unreleased entries into a dated release", () => {
    const released = releaseChangelog(changelog, "0.2.0", "2026-06-19");
    expect(released).toContain("## [Unreleased]\n\n## [0.2.0] - 2026-06-19");
    expect(released).toContain("## [0.1.22-internal] - 2026-06-18");
    expect(extractUnreleased(released)).toBe("");
  });

  it("updates all monorepo metadata and supports interrupted-release recovery", () => {
    const root = mkdtempSync(path.join(tmpdir(), "secure-auth-release-"));
    const manifestPaths = [
      "package.json",
      "packages/secure-auth/package.json",
      "apps/starter/package.json",
      "apps/consumer-demo/package.json",
    ];
    try {
      for (const manifestPath of manifestPaths) {
        mkdirSync(path.dirname(path.join(root, manifestPath)), { recursive: true });
        writeFileSync(
          path.join(root, manifestPath),
          `${JSON.stringify({ name: manifestPath, version: "0.1.22-internal" }, null, 2)}\n`,
        );
      }
      writeFileSync(
        path.join(root, "package-lock.json"),
        `${JSON.stringify({
          version: "0.1.22-internal",
          packages: Object.fromEntries(
            ["", "packages/secure-auth", "apps/starter", "apps/consumer-demo"].map((key) => [
              key,
              { version: "0.1.22-internal" },
            ]),
          ),
        }, null, 2)}\n`,
      );
      writeFileSync(path.join(root, "CHANGELOG.md"), changelog);

      expect(prepareRelease({ root, releaseSpec: "patch", date: "2026-06-19" })).toEqual({
        version: "0.1.23",
        changed: true,
        recovery: false,
      });
      for (const manifestPath of manifestPaths) {
        expect(JSON.parse(readFileSync(path.join(root, manifestPath), "utf8")).version).toBe("0.1.23");
      }
      expect(prepareRelease({ root, releaseSpec: "" })).toEqual({
        version: "0.1.23",
        changed: false,
        recovery: true,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
