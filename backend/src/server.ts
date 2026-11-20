import { createApp } from "./app.ts";
import { parseEnv } from "./config/env.ts";
import { createPool } from "./lib/db.ts";
import { createLogger } from "./lib/logger.ts";

const parsed = parseEnv(process.env);
if (!parsed.success) {
  // Логгера ещё нет: он настраивается из env.
  for (const issue of parsed.error.issues) {
    console.error(`Env ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}
const env = parsed.data;

const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV === "development" });
const pool = createPool(env.DATABASE_URL);
const app = createApp({ pool, logger });

const server = app.listen(env.PORT, env.HOST, (error) => {
  if (error) throw error;
  logger.info(`Server listening on http://${env.HOST}:${env.PORT}`);
});

// Мягкая остановка: дождаться текущих запросов, закрыть базу, выйти.
// Node 24 сам закрывает простаивающие keep-alive соединения в server.close().
const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

function shutdown(reason: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Shutting down: ${reason}`);

  setTimeout(() => {
    logger.error(`Shutdown did not finish in ${SHUTDOWN_TIMEOUT_MS} ms, forcing exit`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  // Ошибка close() бывает, только если сервер не запустился; базу закрываем всё равно.
  server.close(() => {
    pool
      .end()
      .catch((error: unknown) => {
        logger.error({ err: error }, "Failed to close database pool");
        process.exitCode = 1;
      })
      .finally(() => {
        logger.info("Server stopped");
        process.exit();
      });
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Сбой процесса: состояние неизвестно, поэтому лог и выход с кодом 1.
function crash(error: unknown, kind: string): void {
  logger.fatal({ err: error }, kind);
  process.exitCode = 1;
  shutdown(kind);
}

process.on("unhandledRejection", (reason) => crash(reason, "Unhandled rejection"));
process.on("uncaughtException", (error) => crash(error, "Uncaught exception"));
