import type { SecureAuthConfig } from "@/core/types.js";

export type AccountEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/** Sends account email through the injected EmailProvider — no transport-specific logic. */
export async function deliverAccountEmail(
  config: SecureAuthConfig,
  input: AccountEmailPayload
): Promise<void> {
  const { email } = config;
  await email.provider.send({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
