import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["intuit-oauth"],
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // pdf.js (used by react-pdf) tries to require 'canvas' — not needed in browser
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
