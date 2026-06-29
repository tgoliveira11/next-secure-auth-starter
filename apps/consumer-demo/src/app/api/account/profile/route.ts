import { secureAuth } from "@/lib/secure-auth";

export const GET = secureAuth.routes.accountProfile.GET;
export const POST = secureAuth.routes.accountProfile.POST;
