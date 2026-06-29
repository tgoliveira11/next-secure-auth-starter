"use client";

import { useState, useEffect, useCallback } from "react";
import { PageShell } from "../../layouts/page-shell.js";
import { Button } from "../../primitives/button.js";
import { Alert } from "../../primitives/alert.js";
import { Card, CardHeader, CardTitle, CardDescription } from "../../primitives/card.js";
import { PageHeader } from "../../primitives/page-header.js";
import { LoadingState } from "../../primitives/loading-state.js";
import { EmptyState } from "../../primitives/empty-state.js";

type LockRecord = {
  id: string;
  email?: string | null;
  userId?: string | null;
  attempts: number;
  lockedAt?: string | null;
  frozenUntil?: string | null;
  lastAttemptAt: string;
};

type AdminLocksPageProps = {
  apiBase?: string;
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function LockTable({
  title,
  description,
  records,
  actionLabel,
  onAction,
  loading,
}: {
  title: string;
  description: string;
  records: LockRecord[];
  actionLabel: string;
  onAction: (userId: string) => Promise<void>;
  loading: Set<string>;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {records.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState title="No records" description="Nothing to show here." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--card-muted)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Email</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Attempts</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Last attempt</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Locked / Frozen until</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--card-muted)]">
                  <td className="px-4 py-3 font-mono text-xs">{r.email ?? r.userId ?? "—"}</td>
                  <td className="px-4 py-3">{r.attempts}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatDate(r.lastAttemptAt)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {formatDate(r.lockedAt ?? r.frozenUntil)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.userId && (
                      <Button
                        variant="secondary"
                        className="text-xs"
                        disabled={loading.has(r.userId)}
                        onClick={() => onAction(r.userId!)}
                      >
                        {loading.has(r.userId!) ? "Unlocking…" : actionLabel}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function AdminLocksPage({ apiBase = "/api/auth" }: AdminLocksPageProps) {
  const [locked, setLocked] = useState<LockRecord[]>([]);
  const [frozen, setFrozen] = useState<LockRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/admin/locks`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setLocked(data.locked ?? []);
      setFrozen(data.frozen ?? []);
    } catch {
      setError("Failed to load lock data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { void load(); }, [load]);

  async function handleUnlock(userId: string) {
    setActionLoading((prev) => new Set(prev).add(userId));
    setError("");
    try {
      const res = await fetch(`${apiBase}/admin/locks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Unlock failed");
      setSuccess("Account unlocked successfully.");
      await load();
    } catch {
      setError("Failed to unlock account. Please try again.");
    } finally {
      setActionLoading((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    }
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title="Account Locks"
        description="Manage accounts locked or frozen due to failed login attempts."
        action={
          <Button variant="secondary" onClick={load} disabled={isLoading}>
            {isLoading ? "Loading…" : "Refresh"}
          </Button>
        }
      />

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && (
        <Alert variant="success" className="mb-4">
          {success}
          <button
            className="ml-2 text-xs underline"
            onClick={() => setSuccess("")}
          >
            Dismiss
          </button>
        </Alert>
      )}

      {isLoading ? (
        <LoadingState label="Loading lock records…" />
      ) : (
        <div className="space-y-6">
          <LockTable
            title="Permanently locked accounts"
            description="These accounts cannot log in. An admin must unlock them manually."
            records={locked}
            actionLabel="Unlock"
            onAction={handleUnlock}
            loading={actionLoading}
          />
          <LockTable
            title="Temporarily frozen accounts"
            description="These accounts are on a cooldown due to repeated failed attempts."
            records={frozen}
            actionLabel="Unfreeze"
            onAction={handleUnlock}
            loading={actionLoading}
          />
        </div>
      )}
    </PageShell>
  );
}
