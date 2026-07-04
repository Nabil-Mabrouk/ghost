import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static, client-only app (offline-first PWA). No backend anywhere.
  output: "export",
};

export default nextConfig;
