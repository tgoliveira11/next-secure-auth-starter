CREATE TABLE "webauthn_broker_operations" (
	"request_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_session_id" uuid NOT NULL,
	"credential_db_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"action" text NOT NULL,
	"challenge_hash" text NOT NULL,
	"ephemeral_public_key_thumbprint" text,
	"envelope_id_hash" text,
	"challenge_expires_at" timestamp with time zone NOT NULL,
	"challenge_consumed_at" timestamp with time zone,
	"grant_jti_hash" text,
	"grant_expires_at" timestamp with time zone,
	"receipt_jti_hash" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webauthn_broker_operations_challenge_hash_unique" UNIQUE("challenge_hash"),
	CONSTRAINT "webauthn_broker_operations_grant_jti_hash_unique" UNIQUE("grant_jti_hash"),
	CONSTRAINT "webauthn_broker_operations_receipt_jti_hash_unique" UNIQUE("receipt_jti_hash"),
	CONSTRAINT "webauthn_broker_operations_purpose_check" CHECK ("webauthn_broker_operations"."purpose" = 'portable_vault'),
	CONSTRAINT "webauthn_broker_operations_action_scope_check" CHECK ((
        ("webauthn_broker_operations"."action" = 'enroll' AND "webauthn_broker_operations"."envelope_id_hash" IS NULL AND "webauthn_broker_operations"."ephemeral_public_key_thumbprint" IS NULL)
        OR ("webauthn_broker_operations"."action" = 'revoke' AND "webauthn_broker_operations"."envelope_id_hash" IS NOT NULL AND "webauthn_broker_operations"."ephemeral_public_key_thumbprint" IS NULL)
        OR ("webauthn_broker_operations"."action" = 'unlock' AND "webauthn_broker_operations"."envelope_id_hash" IS NOT NULL AND "webauthn_broker_operations"."ephemeral_public_key_thumbprint" IS NOT NULL)
      ))
);
--> statement-breakpoint
ALTER TABLE "webauthn_broker_operations" ADD CONSTRAINT "webauthn_broker_operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_broker_operations" ADD CONSTRAINT "webauthn_broker_operations_account_session_id_account_sessions_id_fk" FOREIGN KEY ("account_session_id") REFERENCES "public"."account_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_broker_operations" ADD CONSTRAINT "webauthn_broker_operations_credential_db_id_passkey_credentials_id_fk" FOREIGN KEY ("credential_db_id") REFERENCES "public"."passkey_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_webauthn_broker_operations_user_session" ON "webauthn_broker_operations" USING btree ("user_id","account_session_id");--> statement-breakpoint
CREATE INDEX "idx_webauthn_broker_operations_expiry" ON "webauthn_broker_operations" USING btree ("challenge_expires_at");--> statement-breakpoint
CREATE INDEX "idx_webauthn_broker_operations_credential" ON "webauthn_broker_operations" USING btree ("credential_db_id");