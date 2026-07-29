import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
// @ts-expect-error The release helper is an intentionally uncompiled Node.js module.
import { bumpVersion, extractUnreleased, inferReleaseBump, prepareRelease, releaseChangelog, resolveReleaseVersion } from "../../../../scripts/prepare-release.mjs";
// @ts-expect-error The release guard is an intentionally uncompiled Node.js module.
import { verifyBuiltPackageVersion } from "../../../../scripts/verify-package-version.mjs";

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
  function writeVersionFixture(root: string, manifestVersion: string, runtimeVersion: string) {
    mkdirSync(path.join(root, "packages/secure-auth/dist"), { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      `${JSON.stringify({ version: manifestVersion }, null, 2)}\n`,
    );
    writeFileSync(
      path.join(root, "packages/secure-auth/package.json"),
      `${JSON.stringify({ version: manifestVersion }, null, 2)}\n`,
    );
    writeFileSync(
      path.join(root, "packages/secure-auth/dist/index.js"),
      `export const SECURE_AUTH_PACKAGE_VERSION = ${JSON.stringify(runtimeVersion)};\n`,
    );
    writeFileSync(
      path.join(root, "packages/secure-auth/dist/index.cjs"),
      `exports.SECURE_AUTH_PACKAGE_VERSION = ${JSON.stringify(runtimeVersion)};\n`,
    );
  }

  it("requires release metadata to reach protected main through a pull request", () => {
    const workflowPath = path.resolve(
      import.meta.dirname,
      "../../../..",
      ".github/workflows/publish-secure-auth.yml",
    );
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("Require release metadata to be merged through a pull request");
    expect(workflow).toContain("steps.release.outputs.changed == 'true'");
    expect(workflow).not.toContain("git push origin HEAD:main");
    expect(workflow).not.toContain("Commit and push release metadata");
  });

  it("rejects release artifacts whose runtime version differs from the manifest", async () => {
    const validRoot = mkdtempSync(path.join(tmpdir(), "secure-auth-version-valid-"));
    const staleRoot = mkdtempSync(path.join(tmpdir(), "secure-auth-version-stale-"));
    try {
      writeVersionFixture(validRoot, "0.9.1", "0.9.1");
      writeVersionFixture(staleRoot, "0.9.1", "0.6.1");

      await expect(verifyBuiltPackageVersion({ root: validRoot })).resolves.toEqual({
        version: "0.9.1",
      });
      await expect(verifyBuiltPackageVersion({ root: staleRoot })).rejects.toThrow(
        /runtime version disagrees/,
      );
    } finally {
      rmSync(validRoot, { recursive: true, force: true });
      rmSync(staleRoot, { recursive: true, force: true });
    }
  });

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
      "apps/dev-harness/package.json",
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
            ["", "packages/secure-auth", "apps/dev-harness", "apps/consumer-demo"].map((key) => [
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
