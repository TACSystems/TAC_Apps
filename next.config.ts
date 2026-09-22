import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Self-contained server bundle — this is what the Electron build spawns
  // as a local server, and what a plain `node .next/standalone/server.js`
  // deploy would run too. Doesn't affect `next dev` / `next start`.
  output: "standalone",
};

export default nextConfig;
