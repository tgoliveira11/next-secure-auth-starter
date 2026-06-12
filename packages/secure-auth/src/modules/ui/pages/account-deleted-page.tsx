"use client";

import Link from "next/link";
import { PageShell } from "../layouts/page-shell.js";
import { Button } from "../primitives/button.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../primitives/card.js";
import { type AccountDeletedPageProps } from "./types.js";
import { usePageTitle, useUiMessage, useUiPaths } from "./use-page-ui.js";

export function AccountDeletedPage({
  brand,
  header,
  className,
  width = "medium",
  paths,
  homePath,
  returnHomeLabel: returnHomeLabelProp,
  title: titleProp,
  subtitle,
  description: descriptionProp,
}: AccountDeletedPageProps) {
  const resolved = useUiPaths(paths);
  const destination = homePath ?? resolved.home;
  const title = usePageTitle(
    { title: titleProp, subtitle },
    "accountDeletedTitle",
    "Your account has been deleted"
  );
  const description = useUiMessage(
    descriptionProp,
    "accountDeletedDescription",
    "Your account and related data have been removed from active storage. Local private material on this browser was cleared when possible."
  );
  const returnHomeLabel = useUiMessage(returnHomeLabelProp, "returnHomeLabel", "Return home");

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
