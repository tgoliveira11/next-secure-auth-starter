"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOutAccount } from "@/lib/sign-out-account";
import { useId, useState } from "react";
import { Button } from "@tgoliveira/secure-auth/react";
import { AppMark } from "@tgoliveira/secure-auth/react";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@tgoliveira/secure-auth/client";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/sessions", label: "Sessions" },
  { href: "/settings/security", label: "Security" },
] as const;

export function Nav() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleSignOut() {
    await signOutAccount();
    router.push("/");
  }

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href={session ? "/dashboard" : "/"}
          className="flex items-center gap-2 text-lg font-semibold text-[var(--primary)]"
        >
          <AppMark size={28} />
          <span className="hidden sm:inline">{APP_NAME}</span>
          <span className="sm:hidden">Secure Auth</span>
        </Link>

        {session ? (
          <>
            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-[var(--radius)] px-3 py-2 text-sm transition-colors hover:bg-[var(--card-muted)]",
                    isActive(link.href)
                      ? "font-medium text-[var(--primary)]"
                      : "text-[var(--foreground)]"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Button variant="secondary" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>

            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-[var(--border)] px-3 text-sm font-medium md:hidden"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
            >
              Menu
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="hidden text-sm text-[var(--muted)] hover:text-[var(--foreground)] sm:inline"
            >
              Create account
            </Link>
            <Link href="/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
          </div>
        )}
      </div>

      {session && menuOpen && (
        <nav
          id={menuId}
          aria-label="Main navigation"
          className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 md:hidden"
        >
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  className={cn(
                    "block rounded-[var(--radius)] px-3 py-3 text-sm",
                    isActive(link.href) ? "bg-[var(--card-muted)] font-medium" : ""
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <Button variant="secondary" className="w-full" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
