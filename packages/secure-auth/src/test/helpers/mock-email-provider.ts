import type { EmailProvider } from "../../core/types.js";

export function createMockEmailProvider(
  send: EmailProvider["send"] = async () => {}
): EmailProvider {
  return { send };
}
