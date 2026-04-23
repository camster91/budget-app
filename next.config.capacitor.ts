import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Capacitor (Android APK)
  output: "export",
  distDir: "dist",

  // Images must be unoptimized for static export
  images: {
    unoptimized: true,
  },

  // Security headers (stripped for static HTML — injected at server level)
  trailingSlash: true,
};

export default nextConfig;
