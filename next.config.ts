import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["intuit-oauth"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
