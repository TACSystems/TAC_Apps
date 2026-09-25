import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  { settings: { next: { rootDir: "apps/tac-log/" } } },
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    "**/release/**",
    "**/scripts/**",
    "**/electron/**",
    "core/electron/**",
    "core/test/**",
    "**/src/types/better-sqlite3-multiple-ciphers.d.ts",
  ]),
]);

export default eslintConfig;
