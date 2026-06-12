import "server-only";
import "@/lib/secure-auth";
import NextAuth from "next-auth";
import { createNextAuthRouteHandlers } from "@tgoliveira/secure-auth/next";

export const { GET, POST } = createNextAuthRouteHandlers(NextAuth);
