import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  // Makes the "server-only" import marker resolve to its no-op build
  // (mirrors Next.js's "react-server" condition) instead of throwing.
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
});
