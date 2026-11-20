import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// `.env` лежит в корне репозитория (как и для `--env-file-if-exists=../.env`).
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig(({ mode }) => ({
  // Прод: один dist/server.js со всеми пакетами и shared внутри (ADR-0014).
  build: {
    ssr: "src/server.ts",
    target: "node24",
    outDir: "dist",
    sourcemap: true,
  },
  ssr: {
    noExternal: true,
    // Встроенные модули Node остаются внешними.
    target: "node",
  },
  test: {
    environment: "node",
    // Vitest сам не кладёт `.env` в process.env; '' — все переменные, без префикса VITE_.
    env: loadEnv(mode, repoRoot, ""),
    globalSetup: ["./src/test-global-setup.ts"],
  },
}));
