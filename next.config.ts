import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["intuit-oauth"],
  eslint: { ignoreDuringBuilds: true },
  // No custom webpack config needed — PDF rendering uses native browser viewer
};

export default nextConfig;
