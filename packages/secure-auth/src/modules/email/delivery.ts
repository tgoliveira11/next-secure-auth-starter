import { getSecureAuthConfig } from "@/core/secure-auth-runtime";

export type AccountEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/** Sends account email through the injected EmailProvider — no transport-specific logic. */
export async function deliverAccountEmail(input: AccountEmailPayload): Promise<void> {
  const { email } = getSecureAuthConfig();
  await email.provider.send({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}