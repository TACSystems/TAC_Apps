import type { NextConfig } from "next";
import path from "path";

const repoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3-multiple-ciphers"],
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
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
      "../../node_modules/@img/**/*",
      "../../node_modules/sharp/**/*",
      "../../core/test/**/*",
      "../../**/*.md",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
