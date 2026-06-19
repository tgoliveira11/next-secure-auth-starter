import { secureAuth } from "@/lib/secure-auth";

export const POST = secureAuth.routes.magicLinkVerify.POST;
export const GET = secureAuth.routes.magicLinkVerify.GET;
