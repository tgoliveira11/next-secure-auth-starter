"use client";

import Link from "next/link";
import { useUiPaths } from "../use-page-ui.js";
import { PageShell } from "../../layouts/page-shell.js";
import { Card, CardHeader, CardTitle, CardDescription } from "../../primitives/card.js";
import type { AuthPaths } from "../types.js";

type AdminPanelPageProps = {
  paths?: AuthPaths;
};

const SECTIONS = [
  {
    key: "adminUsers",
    label: "Users",
    description: "Manage user accounts, roles, and statuses.",
    suffix: "/users",
  },
  {
    key: "adminWaitlist",
    label: "Waitlist",
    description: "Review and approve pending registrations.",
    suffix: "/waitlist",
  },
  {
    key: "adminInvites",
    label: "Invites",
    description: "Manage invite codes and quotas.",
    suffix: "/invites",
  },
  {
    key: "adminLocks",
    label: "Account Locks",
    description: "View frozen and locked accounts; unlock users.",
    suffix: "/locks",
  },
  {
    key: "adminApiKeys",
    label: "API Keys",
    description: "Create and revoke machine-to-machine API keys.",
    suffix: "/api-keys",
  },
  {
    key: "adminConfig",
    label: "Config",
    description: "Override runtime configuration values.",
    suffix: "/config",
  },
] as const;

export function AdminPanelPage({ paths }: AdminPanelPageProps) {
  const resolved = useUiPaths(paths);
  const base = resolved.adminPanel ?? "/admin";

  return (
    <PageShell width="wide">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Admin Panel</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage your application users, security, and configuration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link key={section.key} href={`${base}${section.suffix}`} className="block">
            <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base">{section.label}</CardTitle>
                <CardDescription className="text-sm">{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
