import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3-multiple-ciphers"],
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": [
      "./data/**/*",
      "./src/**/*",
      "./electron/**/*",
      "./scripts/**/*",
      "./release/**/*",
      "./sql/**/*",
      "./*.md",
      "./package-lock.json",
      "./tsconfig.tsbuildinfo",
      "./node_modules/@img/**/*",
      "./node_modules/sharp/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
