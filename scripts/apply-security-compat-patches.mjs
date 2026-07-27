import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const minimatchPackageUrl = new URL("../node_modules/minimatch/package.json", import.meta.url);
const minimatchSourceUrl = new URL("../node_modules/minimatch/minimatch.js", import.meta.url);
const globMinimatchPackageUrl = new URL(
  "../node_modules/glob/node_modules/minimatch/package.json",
  import.meta.url
);
const globMinimatchCommonJsUrl = new URL(
  "../node_modules/glob/node_modules/minimatch/dist/commonjs/index.js",
  import.meta.url
);
const globMinimatchEsmUrl = new URL(
  "../node_modules/glob/node_modules/minimatch/dist/esm/index.js",
  import.meta.url
);
const legacyImport = "var expand = require('brace-expansion')";
const compatibleImport = [
  "var braceExpansion = require('brace-expansion')",
  "var expand = typeof braceExpansion === 'function' ? braceExpansion : braceExpansion.expand",
].join("\n");

const minimatchPackage = JSON.parse(await readFile(minimatchPackageUrl, "utf8"));
if (minimatchPackage.version !== "3.1.5") {
  throw new Error(
    `Refusing to patch unexpected minimatch ${minimatchPackage.version}; review the security compatibility patch.`
  );
}

const source = await readFile(minimatchSourceUrl, "utf8");
if (source.includes(compatibleImport)) {
  process.stdout.write("Security compatibility patch already applied to minimatch 3.1.5.\n");
} else {
  const matches = source.split(legacyImport).length - 1;
  if (matches !== 1) {
    throw new Error(
      `Expected one legacy brace-expansion import in ${fileURLToPath(minimatchSourceUrl)}, found ${matches}.`
    );
  }

  await writeFile(minimatchSourceUrl, source.replace(legacyImport, compatibleImport));
  process.stdout.write("Applied brace-expansion 5 compatibility patch to minimatch 3.1.5.\n");
}

const globMinimatchPackage = JSON.parse(await readFile(globMinimatchPackageUrl, "utf8"));
if (globMinimatchPackage.version !== "9.0.9") {
  throw new Error(
    `Refusing to patch unexpected glob minimatch ${globMinimatchPackage.version}; review the security compatibility patch.`
  );
}

async function applyExactReplacements(sourceUrl, replacements, label) {
  let nextSource = await readFile(sourceUrl, "utf8");
  let changed = false;

  for (const [legacySource, compatibleSource] of replacements) {
    if (nextSource.includes(compatibleSource)) continue;

    const matches = nextSource.split(legacySource).length - 1;
    if (matches !== 1) {
      throw new Error(
        `Expected one legacy brace-expansion reference in ${fileURLToPath(sourceUrl)}, found ${matches}.`
      );
    }

    nextSource = nextSource.replace(legacySource, compatibleSource);
    changed = true;
  }

  if (changed) {
    await writeFile(sourceUrl, nextSource);
    process.stdout.write(`Applied brace-expansion 5 compatibility patch to ${label}.\n`);
  } else {
    process.stdout.write(`Security compatibility patch already applied to ${label}.\n`);
  }
}

await applyExactReplacements(
  globMinimatchCommonJsUrl,
  [
    [
      'const brace_expansion_1 = __importDefault(require("brace-expansion"));',
      'const brace_expansion_1 = require("brace-expansion");',
    ],
    [
      "return (0, brace_expansion_1.default)(pattern);",
      "return (0, brace_expansion_1.expand)(pattern);",
    ],
  ],
  "minimatch 9.0.9 CommonJS"
);

await applyExactReplacements(
  globMinimatchEsmUrl,
  [["import expand from 'brace-expansion';", "import { expand } from 'brace-expansion';"]],
  "minimatch 9.0.9 ESM"
);
