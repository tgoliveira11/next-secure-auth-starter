import { Card, CardDescription, CardHeader, CardTitle } from "@tgoliveira/secure-auth/react";
import { PROJECT_DOCUMENTATION_LINKS } from "@/lib/project-documentation-links";

export function DocumentationLinksSection() {
  return (
    <section aria-labelledby="project-documentation-heading" className="text-left">
      <div className="mb-6 space-y-2">
        <h2
          id="project-documentation-heading"
          className="text-2xl font-semibold tracking-tight text-[var(--foreground)]"
        >
          Project documentation
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)] md:text-base">
          Explore the package architecture, API, customization model, consumer setup, migrations,
          security notes, and release history.
        </p>
      </div>

      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECT_DOCUMENTATION_LINKS.map((link) => (
          <li key={link.href} className="h-full">
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block h-full rounded-[var(--radius)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              <Card
                muted
                className="h-full transition-colors group-hover:border-[var(--accent-muted)] group-focus-visible:border-[var(--accent-muted)]"
              >
                <CardHeader>
                  <CardTitle className="text-base">
                    {link.title}
                    <span className="sr-only"> (opens in GitHub in a new tab)</span>
                  </CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
