"use client";

import { useState, useEffect, useCallback } from "react";
import { PageShell } from "../../layouts/page-shell.js";
import { Button } from "../../primitives/button.js";
import { Alert } from "../../primitives/alert.js";
import { useUiPaths } from "../use-page-ui.js";
import type { AuthPaths } from "../types.js";

type UserRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  emailVerifiedAt: string | null;
};

type AdminUsersPageProps = {
  paths?: AuthPaths;
  apiBase?: string;
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-[var(--success-muted)] text-[var(--success)] border-[var(--success)]",
    pending: "bg-[var(--warning-muted)] text-[var(--warning)] border-[var(--warning)]",
    suspended: "bg-[var(--danger-muted)] text-[var(--danger)] border-[var(--danger)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${variants[status] ?? variants.active}`}
    >
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
        role === "admin"
          ? "bg-[var(--primary)] text-white border-transparent"
          : "bg-[var(--card-muted)] text-[var(--muted)] border-[var(--border)]"
      }`}
    >
      {role}
    </span>
  );
}

export function AdminUsersPage({ paths, apiBase = "/api/auth" }: AdminUsersPageProps) {
  const resolved = useUiPaths(paths);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`${apiBase}/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [apiBase, statusFilter, searchQuery]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function patchUser(id: string, patch: { role?: string; status?: string }) {
    setActionLoading(id);
    try {
      const res = await fetch(`${apiBase}/admin/users/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Action failed");
        return;
      }
      await fetchUsers();
    } catch {
      setError("Action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <PageShell width="wide">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--muted)] mb-1">
            <a href={resolved.adminPanel ?? "/admin"} className="hover:underline">Admin</a>
            {" / Users"}
          </p>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Users <span className="text-sm font-normal text-[var(--muted)]">({total})</span>
          </h1>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}{" "}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </Alert>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <Button variant="secondary" onClick={fetchUsers} className="ml-auto text-sm">
          Refresh
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">Loading…</p>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">No users found.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--card-muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Email</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Role</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Verified</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((user) => (
                <tr key={user.id} className="bg-[var(--card)] hover:bg-[var(--card-muted)]">
                  <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {user.emailVerifiedAt ? "✓" : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {user.status === "pending" && (
                        <Button
                          variant="primary"
                          className="text-xs"
                          disabled={actionLoading === user.id}
                          onClick={() => patchUser(user.id, { status: "active" })}
                        >
                          Approve
                        </Button>
                      )}
                      {user.status === "active" && (
                        <Button
                          variant="secondary"
                          className="text-xs"
                          disabled={actionLoading === user.id}
                          onClick={() => patchUser(user.id, { status: "suspended" })}
                        >
                          Suspend
                        </Button>
                      )}
                      {user.status === "suspended" && (
                        <Button
                          variant="secondary"
                          className="text-xs"
                          disabled={actionLoading === user.id}
                          onClick={() => patchUser(user.id, { status: "active" })}
                        >
                          Reactivate
                        </Button>
                      )}
                      {user.role !== "admin" && (
                        <Button
                          variant="secondary"
                          className="text-xs"
                          disabled={actionLoading === user.id}
                          onClick={() => patchUser(user.id, { role: "admin" })}
                        >
                          Make admin
                        </Button>
                      )}
                      {user.role === "admin" && (
                        <Button
                          variant="secondary"
                          className="text-xs"
                          disabled={actionLoading === user.id}
                          onClick={() => patchUser(user.id, { role: "user" })}
                        >
                          Remove admin
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
