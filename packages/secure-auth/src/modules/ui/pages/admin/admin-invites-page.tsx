"use client";

import { useState, useEffect, useCallback } from "react";
import { PageShell } from "../../layouts/page-shell.js";
import { Button } from "../../primitives/button.js";
import { Alert } from "../../primitives/alert.js";
import { Badge } from "../../primitives/badge.js";
import { Card, CardHeader, CardTitle, CardDescription } from "../../primitives/card.js";
import { PageHeader } from "../../primitives/page-header.js";
import { LoadingState } from "../../primitives/loading-state.js";
import { EmptyState } from "../../primitives/empty-state.js";
import { Input } from "../../primitives/input.js";
import { FormField } from "../../primitives/form-field.js";

type InviteCode = {
  id: string;
  code: string;
  createdBy?: string | null;
  maxUses?: number | null;
  usedCount: number;
  emailHint?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
};

type AdminInvitesPageProps = {
  apiBase?: string;
};

function codeStatus(c: InviteCode): { label: string; variant: "success" | "danger" | "muted" } {
  if (c.revokedAt) return { label: "Revoked", variant: "danger" };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: "Expired", variant: "muted" };
  if (c.maxUses !== null && c.usedCount >= (c.maxUses ?? 0)) return { label: "Exhausted", variant: "muted" };
  return { label: "Active", variant: "success" };
}

export function AdminInvitesPage({ apiBase = "/api/auth" }: AdminInvitesPageProps) {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [emailHint, setEmailHint] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/admin/invites`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCodes(data.codes ?? []);
    } catch {
      setError("Failed to load invite codes.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { void load(); }, [load]);

  async function handleRevoke(codeId: string) {
    setRevoking((prev) => new Set(prev).add(codeId));
    try {
      const res = await fetch(`${apiBase}/admin/invites`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeId }),
      });
      if (!res.ok) throw new Error("Revoke failed");
      await load();
    } catch {
      setError("Failed to revoke code.");
    } finally {
      setRevoking((prev) => { const s = new Set(prev); s.delete(codeId); return s; });
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/admin/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxUses: maxUses ? parseInt(maxUses, 10) : 1,
          emailHint: emailHint || undefined,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      setShowCreate(false);
      setEmailHint("");
      setMaxUses("1");
      await load();
    } catch {
      setError("Failed to create invite code.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title="Invite Codes"
        description="Manage invite codes for controlled registration."
        action={
          <Button onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "Generate code"}
          </Button>
        }
      />

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {showCreate && (
        <Card className="mb-6 space-y-4 p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Generate invite code</h3>
          <FormField id="inv-email" label="Email hint (optional)">
            <Input id="inv-email" type="email" value={emailHint} onChange={(e) => setEmailHint(e.target.value)} placeholder="user@example.com" />
          </FormField>
          <FormField id="inv-uses" label="Max uses">
            <Input id="inv-uses" type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </FormField>
          <Button disabled={creating} onClick={handleCreate}>
            {creating ? "Generating…" : "Generate"}
          </Button>
        </Card>
      )}

      {isLoading ? (
        <LoadingState label="Loading invite codes…" />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>All invite codes</CardTitle>
            <CardDescription>{codes.length} code{codes.length !== 1 ? "s" : ""} total.</CardDescription>
          </CardHeader>
          {codes.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState title="No codes" description="Generate an invite code above." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--card-muted)]">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Code</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Uses</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Hint</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Expires</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {codes.map((c) => {
                    const status = codeStatus(c);
                    return (
                      <tr key={c.id} className="hover:bg-[var(--card-muted)]">
                        <td className="px-4 py-3 font-mono text-xs font-bold">{c.code}</td>
                        <td className="px-4 py-3">{c.usedCount}/{c.maxUses ?? "∞"}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{c.emailHint ?? "—"}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!c.revokedAt && status.label === "Active" && (
                            <Button
                              variant="danger"
                              className="text-xs"
                              disabled={revoking.has(c.id)}
                              onClick={() => handleRevoke(c.id)}
                            >
                              {revoking.has(c.id) ? "Revoking…" : "Revoke"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </PageShell>
  );
}
