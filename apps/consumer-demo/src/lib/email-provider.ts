import type { EmailProvider } from "@tgoliveira/secure-auth/email";

/** Console EmailProvider for local validation — logs delivery, no SMTP. */
export const consoleEmailProvider: EmailProvider = {
  async send(input) {
    console.info("[consumer-demo email]", {
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  },
};
