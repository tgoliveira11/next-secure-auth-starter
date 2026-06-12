"use client";

import Link from "next/link";
import { PageShell } from "../layouts/page-shell.js";
import { Button } from "../primitives/button.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../primitives/card.js";
import { resolveAuthPaths, type AccountDeletedPageProps } from "./types.js";

export function AccountDeletedPage({
  title = "Your account has been deleted",
  description = "Your account and related data have been removed from active storage. Local private material on this browser was cleared when possible.",
  brand,
  header,
  className,
  width = "medium",
  paths,
  homePath,
  returnHomeLabel = "Return home",
}: AccountDeletedPageProps) {
  const resolved = resolveAuthPaths(paths);
  const destination = homePath ?? resolved.home;

  return (
    <PageShell width={width} className={className ?? "text-center"}>
      {brand}
      {header}
      <Card className="mx-auto max-w-lg py-4">
        <CardHeader className="items-center text-center">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <Link href={destination} className="mt-2 inline-block">
          <Button variant="secondary">{returnHomeLabel}</Button>
        </Link>
      </Card>
    </PageShell>
  );
}
