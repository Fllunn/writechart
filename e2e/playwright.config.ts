import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env["CI"];

// Свои порты: dev занимает 5173 и 3000, его бэк ходит в рабочую базу.
// 127.0.0.1, а не localhost: localhost может уйти на ::1.
const HOST = "127.0.0.1";
const FRONTEND_PORT = "4173";
const FRONTEND_URL = `http://${HOST}:${FRONTEND_PORT}`;
const BACKEND_PORT = "3100";
const BACKEND_URL = `http://${HOST}:${BACKEND_PORT}`;

// Playwright `.env` не читает. Берём корневой `.env`, переменная процесса главнее файла
// (как у `node --env-file`). В CI файла нет, адрес приходит из env задачи.
const envFile = new URL("../.env", import.meta.url);
const fileEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
const databaseUrl = process.env["DATABASE_URL_TEST"] || fileEnv["DATABASE_URL_TEST"];

if (!databaseUrl) {
  throw new Error(
    "Нет DATABASE_URL_TEST. Скопируй .env.example в .env и запусти docker compose up -d.",
  );
}

export default defineConfig({
  testDir: "./tests",
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      name: "backend",
      command: "yarn workspace @writechart/backend start",
      // Живость без базы: базу проверяет тест, а не ожидание старта.
      url: `${BACKEND_URL}/api/health`,
      reuseExistingServer: false,
      // Лог бэка в вывод теста: при 503 от /api/health/ready там причина (ошибка базы).
      // LOG_LEVEL=warn оставляет только предупреждения и ошибки.
      stdout: "pipe",
      env: {
        HOST,
        PORT: BACKEND_PORT,
        DATABASE_URL: databaseUrl,
        LOG_LEVEL: "warn",
      },
    },
    {
      name: "frontend",
      command: `yarn workspace @writechart/frontend preview --host ${HOST} --port ${FRONTEND_PORT} --strictPort`,
      url: FRONTEND_URL,
      reuseExistingServer: false,
      // preview.proxy наследует server.proxy, переменная процесса главнее .env.
      env: { API_PROXY_TARGET: BACKEND_URL },
    },
  ],
});
