import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["next-auth"],
  serverExternalPackages: ["postgres", "bcryptjs", "@node-rs/argon2", "@simplewebauthn/server"],
};

export default nextConfig;
