"use client";

import { useState, useEffect, useCallback } from "react";
import { PageShell } from "../layouts/page-shell.js";
import { Button } from "../primitives/button.js";
import { Alert } from "../primitives/alert.js";
import { Badge } from "../primitives/badge.js";
import { Card, CardHeader, CardTitle, CardDescription } from "../primitives/card.js";
import { PageHeader } from "../primitives/page-header.js";
import { LoadingState } from "../primitives/loading-state.js";
import { Input } from "../primitives/input.js";

type ConfigKey = {
  key: string;
  source: "admin" | "env" | "default";
  value: unknown;
};

type AdminConfigPageProps = {
  apiBase?: string;
};

function sourceBadge(source: ConfigKey["source"]) {
  if (source === "admin") return <Badge variant="info">admin</Badge>;
  if (source === "env") return <Badge variant="default">env</Badge>;
  return <Badge variant="muted">default</Badge>;
}

function valueDisplay(value: unknown): string {
  if (value === undefined || value === null) return "—";
  return String(value);
}

export function AdminConfigPage({ apiBase = "/api/auth" }: AdminConfigPageProps) {
  const [configKeys, setConfigKeys] = useState<ConfigKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/admin/config`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setConfigKeys(data.keys ?? []);
    } catch {
      setError("Failed to load config overrides.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { void load(); }, [load]);

  function startEdit(ck: ConfigKey) {
    setEditingKey(ck.key);
    setEditValue(valueDisplay(ck.value));
  }

  function parseEditValue(raw: string): unknown {
    if (raw === "true") return true;
    if (raw === "false") return false;
    const n = Number(raw);
    if (!isNaN(n) && raw.trim() !== "") return n;
    return raw;
  }

  async function saveEdit(key: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/admin/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: parseEditValue(editValue) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      setEditingKey(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function resetOverride(key: string) {
    setSaving(true);
    try {
      await fetch(`${apiBase}/admin/config`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      await load();
    } catch {
      setError("Failed to reset override.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title="Config Overrides"
        description="Override environment configuration at runtime via the database."
        action={<Button variant="secondary" onClick={load} disabled={isLoading}>Refresh</Button>}
      />
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {isLoading ? (
        <LoadingState label="Loading config…" />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Overridable settings</CardTitle>
            <CardDescription>Admin overrides take precedence over env vars and package defaults.</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--card-muted)]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Key</th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Source</th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Value</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {configKeys.map((ck) => (
                  <tr key={ck.key} className="hover:bg-[var(--card-muted)]">
                    <td className="px-4 py-3 font-mono text-xs">{ck.key}</td>
                    <td className="px-4 py-3">{sourceBadge(ck.source)}</td>
                    <td className="px-4 py-3">
                      {editingKey === ck.key ? (
                        <Input
                          className="h-7 text-xs"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveEdit(ck.key);
                            if (e.key === "Escape") setEditingKey(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="font-mono text-xs">{valueDisplay(ck.value)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingKey === ck.key ? (
                          <>
                            <Button variant="primary" className="text-xs" disabled={saving} onClick={() => saveEdit(ck.key)}>
                              {saving ? "Saving…" : "Save"}
                            </Button>
                            <Button variant="secondary" className="text-xs" onClick={() => setEditingKey(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="secondary" className="text-xs" onClick={() => startEdit(ck)}>
                              Edit
                            </Button>
                            {ck.source === "admin" && (
                              <Button variant="danger" className="text-xs" disabled={saving} onClick={() => resetOverride(ck.key)}>
                                Reset
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
