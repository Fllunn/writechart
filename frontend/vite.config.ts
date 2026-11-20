import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// `.env` лежит в корне репозитория.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      // Фронт ходит на относительный /api; в dev Vite пересылает его на бэк, CORS не нужен.
      // 127.0.0.1, а не localhost: localhost может уйти на ::1.
      proxy: {
        "/api": env["API_PROXY_TARGET"] || "http://127.0.0.1:3000",
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
    },
  };
});
