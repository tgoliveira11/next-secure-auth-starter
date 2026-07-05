import { describe, expect, it } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import { buildMagicLinkEmail, buildMagicLinkUrl } from "../magic-link-template";

describe("magic link email template", () => {
  it("uses package default and resolves magic link path from ui.paths", () => {
    const config = buildTestSecureAuthConfig({
      ui: { paths: { magicLinkVerify: "/auth/magic" } },
    });

    const url = buildMagicLinkUrl(config, "raw-token");
    expect(url).toBe("http://localhost:3001/auth/magic?token=raw-token");

    const email = buildMagicLinkEmail(config, url);
    expect(email.subject).toContain("Test App");
    expect(email.html).toContain(url);
  });

  it("delegates to email.templates.magicLink when provided", () => {
    const config = buildTestSecureAuthConfig({
      email: {
        from: "Test <noreply@test>",
        provider: { send: async () => undefined },
        templates: {
          magicLink: ({ appName, magicLinkUrl }) => ({
            subject: `Custom magic — ${appName}`,
            html: `<a href="${magicLinkUrl}">Custom magic</a>`,
          }),
        },
      },
    });

    const url = "http://localhost:3001/login/magic-link?token=abc";
    expect(buildMagicLinkEmail(config, url)).toEqual({
      subject: "Custom magic — Test App",
      html: '<a href="http://localhost:3001/login/magic-link?token=abc">Custom magic</a>',
    });
  });
});
