import { safeLogger } from "@/modules/security/logger/index";
import type { AdminUserRepository } from "../repositories/admin-user-repository";
import type { SecureAuthConfig } from "@/core/types";

export type AdminServiceDeps = {
  config: SecureAuthConfig;
  adminUserRepository: AdminUserRepository;
};

export function createAdminService({ config, adminUserRepository }: AdminServiceDeps) {
  function isEnabled() {
    return config.admin?.enabled === true;
  }

  return {
    isEnabled,

    /** List users with optional filtering and pagination. */
    async listUsers(filter: Parameters<AdminUserRepository["list"]>[0] = {}) {
      return adminUserRepository.list(filter);
    },

    /** Get a single user by ID. */
    async getUser(id: string) {
      return adminUserRepository.findById(id);
    },

    /** Change a user's role. Returns null if user not found. */
    async setUserRole(targetId: string, role: "user" | "admin", actorId: string) {
      const target = await adminUserRepository.findById(targetId);
      if (!target) return null;

      if (target.id === actorId && role !== "admin") {
        return { error: "cannot_demote_self" as const };
      }

      const updated = await adminUserRepository.setRole(targetId, role);
      safeLogger.info("admin.set_user_role", { targetId, role, actorId });
      return updated;
    },

    /** Suspend or reactivate a user account. */
    async setUserStatus(
      targetId: string,
      status: "active" | "suspended",
      actorId: string
    ) {
      const target = await adminUserRepository.findById(targetId);
      if (!target) return null;

      if (target.id === actorId) {
        return { error: "cannot_suspend_self" as const };
      }

      const updated = await adminUserRepository.setStatus(targetId, status);
      safeLogger.info("admin.set_user_status", { targetId, status, actorId });
      return updated;
    },

    /** Approve a pending user (sets status to "active"). */
    async approveUser(targetId: string, actorId: string) {
      const updated = await adminUserRepository.setStatus(targetId, "active");
      safeLogger.info("admin.approve_user", { targetId, actorId });
      return updated;
    },

    /**
     * Bootstrap: promote bootstrapEmail to admin if no admin exists yet.
     * Called once at server startup. Safe to call repeatedly — no-op when
     * at least one admin already exists.
     */
    async bootstrapAdminIfNeeded() {
      const bootstrapEmail = config.admin?.bootstrapEmail;
      if (!bootstrapEmail) return;

      const adminCount = await adminUserRepository.countByRole("admin");
      if (adminCount > 0) return;

      const user = await adminUserRepository.findByEmail(bootstrapEmail);
      if (!user) {
        safeLogger.warn("admin.bootstrap.user_not_found", { email: bootstrapEmail });
        return;
      }

      await adminUserRepository.setRole(user.id, "admin");
      safeLogger.info("admin.bootstrap.promoted", { email: bootstrapEmail, userId: user.id });
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
