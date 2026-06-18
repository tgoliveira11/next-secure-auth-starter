import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
    twoFactorVerified: boolean;
    twoFactorPending: boolean;
    emailVerificationRequired?: boolean;
    twoFactorUpgradeToken?: string;
    accountSessionId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    sid?: string;
    email?: string;
    provider?: string;
    sessionInvalidated?: boolean;
    twoFactorVerified?: boolean;
    twoFactorPending?: boolean;
    emailVerificationRequired?: boolean;
  }
}