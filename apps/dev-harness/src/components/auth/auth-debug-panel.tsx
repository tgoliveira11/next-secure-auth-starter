"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type TraceEvent = {
  at: string;
  step: string;
  meta?: Record<string, string | boolean | number>;
};

export function AuthDebugPanel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [challengePending, setChallengePending] = useState<boolean | null>(null);

  useEffect(() => {
    logClientTrace(
      `client:${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    );
  }, [pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadTrace() {
      try {
        const [traceResponse, challengeResponse] = await Promise.all([
          fetch("/api/auth/login/trace", { cache: "no-store" }),
          fetch("/api/auth/login/challenge-status", { cache: "no-store", credentials: "include" }),
        ]);

        if (traceResponse.ok) {
          const body = (await traceResponse.json()) as { events: TraceEvent[] };
          if (!cancelled) setEvents(body.events);
        }

        if (challengeResponse.ok) {
          const body = (await challengeResponse.json()) as { pending: boolean };
          if (!cancelled) setChallengePending(body.pending);
        }
      } catch {
        // Trace endpoint is optional in local debugging.
      }
    }

    void loadTrace();
    const interval = window.setInterval(() => void loadTrace(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

  if (events.length === 0 && challengePending === null) return null;

  return (
    <aside
      className="mt-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] p-3 text-xs text-[var(--muted)]"
      aria-label="Auth debug trace"
    >
      <p className="mb-2 font-medium text-[var(--foreground)]">Auth debug trace</p>
      {challengePending !== null && (
        <p className="mb-2">
          2FA challenge cookie:{" "}
          <span className="font-medium text-[var(--foreground)]">
            {challengePending ? "present" : "missing"}
          </span>
        </p>
      )}
      <ol className="space-y-1">
        {events.slice(0, 8).map((event) => (
          <li key={`${event.at}-${event.step}`}>
            <span className="font-mono">{event.at.slice(11, 19)}</span> {event.step}
            {event.meta ? ` ${JSON.stringify(event.meta)}` : ""}
          </li>
        ))}
      </ol>
    </aside>
  );
}

function logClientTrace(step: string) {
  if (process.env.NEXT_PUBLIC_AUTH_DEBUG_TRACE !== "true") return;
  console.info("[auth-trace:client]", step);
}
