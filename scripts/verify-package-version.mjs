import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export async function verifyBuiltPackageVersion({ root }) {
  const rootManifestPath = path.join(root, "package.json");
  const packageManifestPath = path.join(root, "packages/secure-auth/package.json");
  const rootManifest = readJson(rootManifestPath);
  const packageManifest = readJson(packageManifestPath);

  if (rootManifest.version !== packageManifest.version) {
    throw new Error(
      `Release manifests disagree: root=${rootManifest.version}, package=${packageManifest.version}`,
    );
  }

  const distRoot = path.join(root, "packages/secure-auth/dist");
  const esmPath = path.join(distRoot, "index.js");
  const cjsPath = path.join(distRoot, "index.cjs");
  const esm = await import(`${pathToFileURL(esmPath).href}?version-guard=${Date.now()}`);
  const cjs = createRequire(packageManifestPath)(cjsPath);
  const expectedVersion = packageManifest.version;

  for (const [format, actualVersion] of [
    ["ESM", esm.SECURE_AUTH_PACKAGE_VERSION],
    ["CJS", cjs.SECURE_AUTH_PACKAGE_VERSION],
  ]) {
    if (actualVersion !== expectedVersion) {
      throw new Error(
        `${format} runtime version disagrees with packages/secure-auth/package.json: runtime=${String(actualVersion)}, manifest=${expectedVersion}`,
      );
    }
  }

  return { version: expectedVersion };
}

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
}

if (isMainModule()) {
  try {
    const result = await verifyBuiltPackageVersion({ root: process.cwd() });
    console.log(`Verified secure-auth runtime package version ${result.version} in ESM and CJS bundles.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
