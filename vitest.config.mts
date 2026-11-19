import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // En los tests no hay límite servidor/cliente: "server-only" no hace nada.
      "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)),
    },
  },
  test: { environment: "node", include: ["lib/**/*.test.ts"], exclude: ["e2e/**", "node_modules/**"] },
});
