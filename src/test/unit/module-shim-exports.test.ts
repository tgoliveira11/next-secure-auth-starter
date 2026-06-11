import { describe, it, expect } from "vitest";

describe("deprecated module shims", () => {
  it("re-export email utilities from legacy paths", async () => {
    const config = await import("@/modules/email/config");
    const send = await import("@/modules/email/send-email");
    const smtp = await import("@/modules/email/smtp-provider");
    const templates = await import("@/modules/email/account-email-templates");
    const scope = await import("@/modules/email/email-scope");

    expect(typeof config.getEmailConfig).toBe("function");
    expect(typeof send.sendEmail).toBe("function");
    expect(typeof smtp.createSmtpTransport).toBe("function");
    expect(typeof templates.verificationEmailContent).toBe("function");
    expect(typeof scope.hashEmailForScope).toBe("function");
  });

  it("re-export security utilities from legacy paths", async () => {
    const security = await import("@/modules/security");
    const loadEnv = await import("@/modules/security/load-env");
    const requestIp = await import("@/modules/security/request-ip");
    const logger = await import("@/modules/security/logger");
    const policy = await import("@/modules/security/password-policy");

    expect(typeof security.safeLogger.info).toBe("function");
    expect(typeof loadEnv.loadEnvFiles).toBe("function");
    expect(typeof requestIp.getClientIp).toBe("function");
    expect(typeof logger.safeLogger.warn).toBe("function");
    expect(typeof policy.getPasswordPolicyConfig).toBe("function");
  });

  it("re-export session and rate-limit shims", async () => {
    const sessionIp = await import("@/modules/sessions/lib/session-ip");
    const userAgent = await import("@/modules/sessions/lib/user-agent-metadata");
    const rateTypes = await import("@/modules/rate-limit/types");
    const inMemory = await import("@/modules/rate-limit/in-memory-adapter");
    const audit = await import("@/modules/audit/policies/audit-sanitization");

    expect(typeof sessionIp.hashIp).toBe("function");
    expect(typeof userAgent.parseUserAgentMetadata).toBe("function");
    expect(typeof rateTypes.buildRateLimitKey).toBe("function");
    expect(typeof inMemory.InMemoryRateLimitAdapter).toBe("function");
    expect(typeof audit.sanitizeAuditMetadata).toBe("function");
  });

  it("re-export UI component shims", async () => {
    const button = await import("@/modules/ui/components/button");
    const errorState = await import("@/modules/ui/components/error-state");
    const textarea = await import("@/modules/ui/components/textarea");

    expect(button.Button).toBeTruthy();
    expect(errorState.ErrorState).toBeTruthy();
    expect(textarea.Textarea).toBeTruthy();
  });
});
