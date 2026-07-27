"use client";

import { useState, useEffect, useCallback } from "react";
import { PageShell } from "../../layouts/page-shell.js";
import { Button } from "../../primitives/button.js";
import { Alert } from "../../primitives/alert.js";
import { Card, CardHeader, CardTitle, CardDescription } from "../../primitives/card.js";
import { PageHeader } from "../../primitives/page-header.js";
import { LoadingState } from "../../primitives/loading-state.js";
import { EmptyState } from "../../primitives/empty-state.js";

type PendingUser = {
  id: string;
  email: string;
  createdAt: string;
};

type AdminWaitlistPageProps = {
  apiBase?: string;
};

type LoadState = "pending" | "ready" | "ready-empty" | "error";

export function AdminWaitlistPage({ apiBase = "/api/auth" }: AdminWaitlistPageProps) {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("pending");
  const [error, setError] = useState("");
  const [approving, setApproving] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoadState("pending");
    setError("");
    try {
      const res = await fetch(`${apiBase}/admin/waitlist`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const nextUsers = data.users ?? [];
      setUsers(nextUsers);
      setTotal(data.total ?? data.users?.length ?? 0);
      setLoadState(nextUsers.length === 0 ? "ready-empty" : "ready");
    } catch {
      setUsers([]);
      setTotal(0);
      setError("Failed to load waitlist.");
      setLoadState("error");
    }
  }, [apiBase]);

  useEffect(() => { void load(); }, [load]);

  async function handleApprove(userId: string) {
    setApproving((prev) => new Set(prev).add(userId));
    setError("");
    try {
      const res = await fetch(`${apiBase}/admin/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Approve failed");
      await load();
    } catch {
      setError("Failed to approve user.");
    } finally {
      setApproving((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    }
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title="Waitlist"
        description={
          loadState === "pending"
            ? "Loading accounts pending approval…"
            : loadState === "error"
              ? "Pending account count is unavailable."
              : `${total} account${total !== 1 ? "s" : ""} pending approval.`
        }
        action={<Button variant="secondary" onClick={load} disabled={loadState === "pending"}>Refresh</Button>}
      />
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {loadState === "pending" ? (
        <LoadingState label="Loading waitlist" />
      ) : loadState === "ready" || loadState === "ready-empty" ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Pending accounts</CardTitle>
            <CardDescription>Approve accounts to grant access.</CardDescription>
          </CardHeader>
          {users.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState title="Waitlist is empty" description="No accounts awaiting approval." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--card-muted)]">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Email</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Signed up</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--card-muted)]">
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {new Date(u.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="primary"
                          className="text-xs"
                          disabled={approving.has(u.id)}
                          onClick={() => handleApprove(u.id)}
                        >
                          {approving.has(u.id) ? "Approving…" : "Approve"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
    </PageShell>
  );
}
