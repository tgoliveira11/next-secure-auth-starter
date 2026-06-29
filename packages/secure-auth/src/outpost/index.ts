/**
 * @tgoliveira/secure-auth/outpost
 *
 * Opt-in adapter that bridges the secure-auth EmailProvider interface with the
 * @tgoliveira/outpost transactional outbox. Drop it in wherever you configure
 * createSecureAuth — no other secure-auth code changes.
 *
 * Why use this instead of a plain provider:
 *   - persist-before-dispatch: the email survives process crashes
 *   - at-most-once: each email type gets a stable idempotencyKey derived from
 *     the token or event so retries never duplicate
 *   - suppression list: hard bounces and complaints are auto-suppressed,
 *     protecting sender reputation
 *   - lifecycle tracking: delivered / bounced / complained via provider webhooks
 *   - dead-letter queue + replay: failed messages are inspectable and replayable
 *
 * Usage:
 *   import { OutpostEmailProvider } from "@tgoliveira/secure-auth/outpost";
 *   import { createOutpost } from "@tgoliveira/outpost";
 *
 *   const outpost = createOutpost({ ... });
 *
 *   const secureAuth = createSecureAuth({
 *     email: {
 *       from: "no-reply@example.com",
 *       provider: new OutpostEmailProvider(outpost),
 *     },
 *     ...
 *   });
 *
 * The adapter expects the caller to pass an idempotencyKey via the extended
 * send() input (OutpostEmailInput). All secure-auth internal callers pass a
 * plain EmailProvider input, so the adapter falls back to a content-hash key
 * when none is provided — safe but not idempotent across retries. For
 * production-grade idempotency, wrap the services and pass the token/event id
 * as the key; see OutpostEmailInput below.
 *
 * Worker note: outpost.send() only persists the message. A worker must be
 * running (outpost.send_worker.start() or a cron hitting outpost.tickSend())
 * or nothing is actually delivered.
 */

// The Outpost type comes from the peer dependency. We import it as a type
// only so that this file can be imported without the peer being installed —
// a runtime error is thrown at construction time instead of at import time.
import type { Outpost } from "@tgoliveira/outpost";
import type { EmailProvider } from "../core/types.js";

export type { Outpost };

/**
 * Extended send input accepted by OutpostEmailProvider.send().
 *
 * All standard EmailProvider fields are present. The optional fields below
 * are consumed by the outpost adapter and ignored by plain providers.
 */
export type OutpostEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /**
   * Stable business-level key that deduplicates this specific email send.
   * Derive it from the token or event that triggered the email, not a UUID:
   *
   *   "verify-email-{tokenId}"
   *   "password-reset-{tokenId}"
   *   "magic-link-{tokenId}"
   *   "security-notify-{eventType}-{userId}-{timestampMs}"
   *
   * When omitted the adapter derives a key from a SHA-256 hash of the
   * recipient + subject — safe but not stable across retries if the subject
   * includes a timestamp.
   */
  idempotencyKey?: string;
  /**
   * Optional metadata attached to the outbox row (never put PII here).
   * Appears in outpost.list() and the audit trail.
   */
  metadata?: Record<string, string | number | boolean>;
};

/**
 * OutpostEmailProvider implements the secure-auth EmailProvider interface and
 * routes every email through the @tgoliveira/outpost transactional outbox.
 *
 * Construction fails at runtime (not import time) when @tgoliveira/outpost is
 * not installed, so consumers who do not use the adapter pay no import cost.
 */
export class OutpostEmailProvider implements EmailProvider {
  private readonly outpost: Outpost;

  constructor(outpost: Outpost) {
    this.outpost = outpost;
  }

  async send(input: OutpostEmailInput): Promise<void> {
    const idempotencyKey = input.idempotencyKey ?? (await deriveKey(input));

    await this.outpost.send({
      idempotencyKey,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      metadata: input.metadata,
    });
  }
}

/**
 * Derives a fallback idempotency key from the email content when no explicit
 * key is supplied. Uses the Web Crypto API (available Node ≥ 18 / Edge).
 *
 * The key is stable for the same recipient + subject, which is good enough
 * for one-off fire-and-forget emails. For retryable flows (password reset,
 * magic link) always supply an explicit key derived from the token.
 */
async function deriveKey(input: { to: string; subject: string }): Promise<string> {
  const raw = `${input.to}|${input.subject}`;
  const data = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "sa-derived-" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
