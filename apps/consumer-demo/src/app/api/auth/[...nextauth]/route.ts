import { secureAuth } from "@/lib/secure-auth";
import { createNextAuthRouteHandlers } from "@tgoliveira/secure-auth/next";
import NextAuth from "next-auth";

const handler = createNextAuthRouteHandlers(NextAuth, secureAuth.getServices);
export const { GET, POST } = handler;
