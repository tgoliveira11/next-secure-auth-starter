import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  authProvider: text("auth_provider").notNull(),
  passwordHash: text("password_hash"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  passwordUpdatedAt: timestamp("password_updated_at", { withTimezone: true }),
  // v0.3 additions
  /** "user" | "admin" */
  role: text("role").notNull().default("user"),
  /** "pending" | "active" | "suspended" */
  status: text("status").notNull().default("active"),
  /** Profile fields (enabled via profile.enabled) */
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  profileUpdatedAt: timestamp("profile_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accountSessions = pgTable(
  "account_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authMethod: text("auth_method").notNull(),
    browser: text("browser"),
    platform: text("platform"),
    deviceType: text("device_type"),
    ipHash: text("ip_hash"),
    ipMasked: text("ip_masked"),
    userAgentHash: text("user_agent_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_account_sessions_user_id_revoked_at").on(table.userId, table.revokedAt),
    index("idx_account_sessions_user_id_last_used_at").on(table.userId, table.lastUsedAt),
    index("idx_account_sessions_id_user_id").on(table.id, table.userId),
  ]
);

export const accountTokens = pgTable(
  "account_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email"),
    type: text("type").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_account_tokens_user_id_type").on(table.userId, table.type),
    index("idx_account_tokens_expires_at").on(table.expiresAt),
  ]
);

export const passkeyCredentials = pgTable("passkey_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: text("counter").notNull().default("0"),
  transports: jsonb("transports"),
  friendlyName: text("friendly_name"),
  signInEnabled: boolean("sign_in_enabled").notNull().default(true),
  vaultUnlockEnabled: boolean("vault_unlock_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webauthnChallenges = pgTable(
  "webauthn_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    challenge: text("challenge").notNull(),
    type: text("type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_webauthn_challenges_lookup").on(table.challenge, table.type, table.userId),
    index("idx_webauthn_challenges_expires_at").on(table.expiresAt),
  ]
);

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  count: integer("count").notNull().default(1),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export const userTwoFactorSettings = pgTable("user_two_factor_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  secretEncrypted: jsonb("secret_encrypted"),
  pendingSecretEncrypted: jsonb("pending_secret_encrypted"),
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userTwoFactorBackupCodes = pgTable(
  "user_two_factor_backup_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_user_two_factor_backup_codes_user_id").on(table.userId)]
);

export const userTwoFactorLoginChallenges = pgTable(
  "user_two_factor_login_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengeTokenHash: text("challenge_token_hash").notNull(),
    authProvider: text("auth_provider").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_user_two_factor_login_challenges_user_id").on(table.userId)]
);

export const userTwoFactorLoginTokens = pgTable(
  "user_two_factor_login_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    authMethod: text("auth_method"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_user_two_factor_login_tokens_user_id").on(table.userId)]
);

export const userTwoFactorSessionUpgrades = pgTable(
  "user_two_factor_session_upgrades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_user_two_factor_session_upgrades_user_id").on(table.userId)]
);

// ---------------------------------------------------------------------------
// v0.3 tables
// ---------------------------------------------------------------------------

export const loginAttemptCounters = pgTable(
  "login_attempt_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email"),
    attempts: integer("attempts").notNull().default(0),
    frozenUntil: timestamp("frozen_until", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    unlockedBy: uuid("unlocked_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("udx_login_attempt_counters_user_id").on(table.userId),
    uniqueIndex("udx_login_attempt_counters_email").on(table.email),
  ]
);

export const inviteCodes = pgTable(
  "invite_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    emailHint: text("email_hint"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_invite_codes_code").on(table.code)]
);

export const inviteUses = pgTable("invite_uses", {
  id: uuid("id").primaryKey().defaultRandom(),
  codeId: uuid("code_id")
    .notNull()
    .references(() => inviteCodes.id),
  usedBy: uuid("used_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  scopes: text("scopes").array().notNull().default([]),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedBy: uuid("revoked_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminConfigOverrides = pgTable("admin_config_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type LoginAttemptCounter = typeof loginAttemptCounters.$inferSelect;

export const authSchema = {
  users,
  accountSessions,
  accountTokens,
  passkeyCredentials,
  auditEvents,
  webauthnChallenges,
  rateLimitBuckets,
  userTwoFactorSettings,
  userTwoFactorBackupCodes,
  userTwoFactorLoginChallenges,
  userTwoFactorLoginTokens,
  userTwoFactorSessionUpgrades,
  loginAttemptCounters,
  inviteCodes,
  inviteUses,
  apiKeys,
  adminConfigOverrides,
};

export type AuthSchema = typeof authSchema;