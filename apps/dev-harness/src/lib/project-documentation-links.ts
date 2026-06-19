export const GITHUB_DOCS_BASE_URL =
  "https://github.com/tgoliveira11/next-secure-auth-starter/blob/main";

export type ProjectDocumentationLink = {
  title: string;
  description: string;
  href: string;
};

function githubDoc(path: string): string {
  return `${GITHUB_DOCS_BASE_URL}/${path}`;
}

/** Official GitHub documentation links for the starter home page. */
export const PROJECT_DOCUMENTATION_LINKS: ProjectDocumentationLink[] = [
  {
    title: "Project README",
    description: "Monorepo overview, quick start, and documentation index.",
    href: githubDoc("README.md"),
  },
  {
    title: "Secure Auth package README",
    description: "Package composition root, UI provider, and public entry points.",
    href: githubDoc("packages/secure-auth/README.md"),
  },
  {
    title: "Starter app README",
    description: "How this reference app wires routes, providers, and configuration.",
    href: githubDoc("apps/starter/README.md"),
  },
  {
    title: "Consumer demo README",
    description: "Minimal consumer validation app using public exports only.",
    href: githubDoc("apps/consumer-demo/README.md"),
  },
  {
    title: "Architecture",
    description: "System design, module boundaries, and UI configuration flow.",
    href: githubDoc("docs/architecture.md"),
  },
  {
    title: "Package API",
    description: "Supported public exports, route wrappers, pages, and configuration surface.",
    href: githubDoc("docs/package-api.md"),
  },
  {
    title: "Customization",
    description: "Provider defaults, page overrides, and theme customization.",
    href: githubDoc("docs/customization.md"),
  },
  {
    title: "Consumer quick start",
    description: "Step-by-step guide for adopting the package in a new Next.js app.",
    href: githubDoc("docs/consumer-quick-start.md"),
  },
  {
    title: "Minimal consumer example",
    description: "End-to-end wiring example with layout, routes, and providers.",
    href: githubDoc("docs/minimal-consumer-example.md"),
  },
  {
    title: "Migrations",
    description: "Database migration workflow for auth schema changes.",
    href: githubDoc("docs/migrations.md"),
  },
  {
    title: "Security",
    description: "Security boundaries, token handling, and review expectations.",
    href: githubDoc("docs/security.md"),
  },
  {
    title: "Private package publishing",
    description: "GitHub Packages registry setup and version publishing.",
    href: githubDoc("docs/publishing-private-package.md"),
  },
  {
    title: "Consumer validation checklist",
    description: "Checklist for validating a new consumer integration.",
    href: githubDoc("docs/consumer-validation-checklist.md"),
  },
  {
    title: "Consumer demo validation",
    description: "Validation report for the in-repo consumer demo app.",
    href: githubDoc("docs/consumer-demo-validation.md"),
  },
  {
    title: "Documentation audit",
    description: "Canonical documentation map and cleanup history.",
    href: githubDoc("docs/documentation-audit.md"),
  },
  {
    title: "Changelog",
    description: "Release history and notable package changes.",
    href: githubDoc("CHANGELOG.md"),
  },
];
