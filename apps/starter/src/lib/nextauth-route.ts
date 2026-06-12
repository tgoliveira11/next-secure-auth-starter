import "server-only";
import NextAuth from "next-auth";
import { createNextAuthRouteHandlers } from "@tgoliveira/secure-auth/next";
import { secureAuth } from "@/lib/secure-auth";

export const { GET, POST } = createNextAuthRouteHandlers(NextAuth, secureAuth.getServices);
