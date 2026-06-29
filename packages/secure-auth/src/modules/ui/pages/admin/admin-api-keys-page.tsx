"use client";

import { useState, useEffect, useCallback } from "react";
import { PageShell } from "../layouts/page-shell.js";
import { Button } from "../primitives/button.js";
import { Alert } from "../primitives/alert.js";
import { Badge } from "../primitives/badge.js";
import { Card, CardHeader, CardTitle, CardDescription } from "../primitives/card.js";
import { PageHeader } from "../primitives/page-header.js";
import { LoadingState } from "../primitives/loading-state.js";
import { EmptyState } from "../primitives/empty-state.js";
import { Input } from "../primitives/input.js";
import { FormField } from "../primitives/form-field.js";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdBy?: string | null;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
};

type AdminApiKeysPageProps = {
  apiBase?: string;
};

function keyStatus(k: ApiKey): { label: string; variant: "success" | "danger" | "muted" } {
  if (k.revokedAt) return { label: "Revoked", variant: "danger" };
  if (k.expiresAt && new Date(k.expiresAt) < new Date()) return { label: "Expired", variant: "muted" };
  return { label: "Active", variant: "success" };
}

export function AdminApiKeysPage({ apiBase = "/api/auth" }: AdminApiKeysPageProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState("");
  const [newExpiry, setNewExpiry] = useState("365");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ rawKey: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/admin/api-keys`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch {
      setError("Failed to load API keys.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { void load(); }, [load]);

  async function handleRevoke(keyId: string) {
    setRevoking((prev) => new Set(prev).add(keyId));
    try {
      const res = await fetch(`${apiBase}/admin/api-keys`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });
      if (!res.ok) throw new Error("Revoke failed");
      await load();
    } catch {
      setError("Failed to revoke key.");
    } finally {
      setRevoking((prev) => { const s = new Set(prev); s.delete(keyId); return s; });
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/admin/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          scopes: newScopes ? newScopes.split(",").map((s) => s.trim()).filter(Boolean) : [],
          expiryDays: newExpiry ? parseInt(newExpiry, 10) : null,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = await res.json();
      setCreatedKey(data);
      setShowCreate(false);
      setNewName("");
      setNewScopes("");
      setNewExpiry("365");
      await load();
    } catch {
      setError("Failed to create API key.");
    } finally {
      setCreating(false);
    }
  }

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title="API Keys"
        description="Manage machine-to-machine API keys."
        action={
          <Button onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "Create API key"}
          </Button>
        }
      />

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {createdKey && (
        <Alert variant="success" className="mb-6">
          <p className="mb-2 font-medium">API key created — copy it now, it won't be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-[var(--card-muted)] px-3 py-2 text-xs font-mono break-all">
              {createdKey.rawKey}
            </code>
            <Button variant="secondary" className="shrink-0 text-xs" onClick={copyKey}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <button className="mt-2 text-xs underline" onClick={() => setCreatedKey(null)}>Dismiss</button>
        </Alert>
      )}

      {showCreate && (
        <Card className="mb-6 space-y-4 p-6">
          <h3 className="text-sm font-semibold">Create API key</h3>
          <FormField id="key-name" label="Name">
            <Input id="key-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My service" />
          </FormField>
          <FormField id="key-scopes" label="Scopes (comma-separated, optional)">
            <Input id="key-scopes" value={newScopes} onChange={(e) => setNewScopes(e.target.value)} placeholder="read:users,write:data" />
          </FormField>
          <FormField id="key-expiry" label="Expiry (days, 0 = never)">
            <Input id="key-expiry" type="number" min="0" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
          </FormField>
          <Button disabled={creating || !newName.trim()} onClick={handleCreate}>
            {creating ? "Creating…" : "Create key"}
          </Button>
        </Card>
      )}

      {isLoading ? (
        <LoadingState label="Loading API keys…" />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>All API keys</CardTitle>
            <CardDescription>{keys.length} key{keys.length !== 1 ? "s" : ""}.</CardDescription>
          </CardHeader>
          {keys.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState title="No API keys" description="Create a key above." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--card-muted)]">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Name</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Prefix</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Scopes</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Last used</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted)]">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {keys.map((k) => {
                    const status = keyStatus(k);
                    return (
                      <tr key={k.id} className="hover:bg-[var(--card-muted)]">
                        <td className="px-4 py-3 font-medium">{k.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{k.keyPrefix}…</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{k.scopes.join(", ") || "—"}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {status.label === "Active" && (
                            <Button
                              variant="danger"
                              className="text-xs"
                              disabled={revoking.has(k.id)}
                              onClick={() => handleRevoke(k.id)}
                            >
                              {revoking.has(k.id) ? "Revoking…" : "Revoke"}
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
