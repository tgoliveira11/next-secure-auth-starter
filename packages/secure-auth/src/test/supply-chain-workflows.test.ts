import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../../../..");
const workflowsDirectory = path.join(repositoryRoot, ".github/workflows");

function readWorkflows() {
  return readdirSync(workflowsDirectory)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((name) => ({
      name,
      source: readFileSync(path.join(workflowsDirectory, name), "utf8"),
    }));
}

describe("repository supply-chain workflows", () => {
  it("pins every third-party GitHub Action to an immutable commit SHA", () => {
    const mutableUses: string[] = [];
    for (const workflow of readWorkflows()) {
      for (const match of workflow.source.matchAll(/^\s*uses:\s+([^@\s]+)@([^\s#]+)/gm)) {
        if (!/^[a-f0-9]{40}$/.test(match[2]!)) {
          mutableUses.push(`${workflow.name}: ${match[1]}@${match[2]}`);
        }
      }
    }

    expect(mutableUses).toEqual([]);
  });

  it("disables checkout credential persistence everywhere", () => {
    for (const workflow of readWorkflows()) {
      const checkoutCount = [...workflow.source.matchAll(/uses:\s+actions\/checkout@/g)].length;
      const disabledPersistenceCount = [
        ...workflow.source.matchAll(/persist-credentials:\s+false/g),
      ].length;
      expect(disabledPersistenceCount, workflow.name).toBe(checkoutCount);
    }
  });

  it("keeps explicit least-privilege permissions and CodeQL analysis", () => {
    for (const workflow of readWorkflows()) {
      expect(workflow.source, workflow.name).toMatch(/^permissions:/m);
      expect(workflow.source, workflow.name).not.toContain("permissions: write-all");
    }

    const codeql = readFileSync(path.join(workflowsDirectory, "codeql.yml"), "utf8");
    expect(codeql).toContain("security-events: write");
    expect(codeql).toContain("languages: javascript-typescript");
  });

  it("configures weekly npm and GitHub Actions dependency updates", () => {
    const dependabot = readFileSync(
      path.join(repositoryRoot, ".github/dependabot.yml"),
      "utf8"
    );
    expect(dependabot).toContain("package-ecosystem: npm");
    expect(dependabot).toContain("package-ecosystem: github-actions");
    expect(dependabot.match(/interval: weekly/g)).toHaveLength(2);
  });
});
