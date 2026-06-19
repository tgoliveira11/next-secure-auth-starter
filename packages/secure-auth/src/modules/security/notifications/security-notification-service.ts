import { safeLogger } from "@/modules/security/logger/index";
import {
  buildAccountEmailChangedNotificationEmail,
  buildMagicLinkUsedNotificationEmail,
  buildNewLoginNotificationEmail,
  buildPasswordChangedNotificationEmail,
  buildTwoFactorDisabledNotificationEmail,
  getAppNameFromConfig,
} from "@/modules/email/templates/security-notification-templates";
import type { SecureAuthContext } from "@/core/create-secure-auth-context";
import type { SecureAuthRepositories } from "@/core/create-repositories";

export type SecurityNotificationEvent =
  | {
      type: "new_login";
      userId: string;
      userEmail: string;
      userAgentHash?: string | null;
      browser?: string;
      platform?: string;
      deviceType?: string;
      ipMasked?: string;
      occurredAt?: Date;
    }
  | {
      type: "password_changed";
      userId: string;
      userEmail: string;
      occurredAt?: Date;
    }
  | {
      type: "two_factor_disabled";
      userId: string;
      userEmail: string;
      occurredAt?: Date;
    }
  | {
      type: "account_email_changed";
      userId: string;
      userEmail: string;
      previousEmail: string;
      newEmail: string;
      occurredAt?: Date;
    }
  | {
      type: "magic_link_used";
      userId: string;
      userEmail: string;
      browser?: string;
      platform?: string;
      deviceType?: string;
      ipMasked?: string;
      occurredAt?: Date;
    };

type SecurityNotificationServiceDeps = {
  config: SecureAuthContext["config"];
  ctx: SecureAuthContext;
  repos: SecureAuthRepositories;
};

function isSecurityNotificationsEnabled(config: SecureAuthContext["config"]): boolean {
  return config.auth.securityNotifications?.enabled !== false;
}

export function createSecurityNotificationService(deps: SecurityNotificationServiceDeps) {
  const { config, ctx, repos } = deps;

  async function shouldNotifyNewLogin(userId: string, userAgentHash?: string | null): Promise<boolean> {
    if (!userAgentHash) {
      return true;
    }

    const sessions = await repos.accountSessionRepository.findActiveByUserId(userId);
    const recentHashes = sessions
      .slice(0, 5)
      .map((session) => session.userAgentHash)
      .filter((hash): hash is string => Boolean(hash));

    return !recentHashes.includes(userAgentHash);
  }

  return {
    async notifySecurityEvent(event: SecurityNotificationEvent): Promise<void> {
      if (!isSecurityNotificationsEnabled(config)) {
        return;
      }

      try {
        const appName = getAppNameFromConfig(config);
        const occurredAt = event.occurredAt ?? new Date();

        if (event.type === "new_login") {
          const shouldNotify = await shouldNotifyNewLogin(event.userId, event.userAgentHash);
          if (!shouldNotify) {
            return;
          }

          const content = buildNewLoginNotificationEmail(appName, {
            browser: event.browser,
            platform: event.platform,
            deviceType: event.deviceType,
            ipMasked: event.ipMasked,
            occurredAt,
          });
          await ctx.deliverAccountEmail({ to: event.userEmail, ...content });
          return;
        }

        if (event.type === "password_changed") {
          const content = buildPasswordChangedNotificationEmail(appName, occurredAt);
          await ctx.deliverAccountEmail({ to: event.userEmail, ...content });
          return;
        }

        if (event.type === "two_factor_disabled") {
          const content = buildTwoFactorDisabledNotificationEmail(appName, occurredAt);
          await ctx.deliverAccountEmail({ to: event.userEmail, ...content });
          return;
        }

        if (event.type === "account_email_changed") {
          const content = buildAccountEmailChangedNotificationEmail(appName, {
            previousEmail: event.previousEmail,
            newEmail: event.newEmail,
            occurredAt,
          });
          await ctx.deliverAccountEmail({ to: event.userEmail, ...content });
          return;
        }

        if (event.type === "magic_link_used") {
          const content = buildMagicLinkUsedNotificationEmail(appName, {
            browser: event.browser,
            platform: event.platform,
            deviceType: event.deviceType,
            ipMasked: event.ipMasked,
            occurredAt,
          });
          await ctx.deliverAccountEmail({ to: event.userEmail, ...content });
        }
      } catch (error) {
        safeLogger.warn("Security notification failed", {
          eventType: event.type,
          userId: event.userId,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    },
  };
}

export type SecurityNotificationService = ReturnType<typeof createSecurityNotificationService>;
