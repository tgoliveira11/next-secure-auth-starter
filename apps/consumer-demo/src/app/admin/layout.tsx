/**
 * CONSUMER-DEMO CUSTOMIZATION
 * Admin area layout — not part of @tgoliveira/secure-auth.
 * Auth + role guard is enforced by the package route handlers and middleware.
 */
import { AdminNav } from "@/components/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
