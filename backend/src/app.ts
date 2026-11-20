import { randomUUID } from "node:crypto";
import express from "express";
import type { Express, Router } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Pool } from "./lib/db.ts";
import { errorHandler } from "./lib/http/error-handler.ts";
import { notFound } from "./lib/http/not-found.ts";
import type { Logger } from "./lib/logger.ts";
import { createHealthRouter } from "./modules/health/health.router.ts";

// Опросы мониторинга не пишем в лог (ADR-0015).
const QUIET_PATHS = new Set(["/api/health", "/api/health/ready"]);

export type AppDeps = {
  pool: Pool;
  logger: Logger;
  /** Дополнительные маршруты под `/api` после основных; нужны тестам. */
  registerRoutes?: (router: Router) => void;
};

export function createApp({ pool, logger, registerRoutes }: AppDeps): Express {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers["x-request-id"];
        if (typeof existing === "string" && existing !== "") return existing;
        const id = randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
      },
      autoLogging: {
        ignore: (req) => QUIET_PATHS.has((req.url ?? "").split("?")[0] ?? ""),
      },
    }),
  );
  app.use(helmet());
  app.use(express.json());

  const api = express.Router();
  api.use(createHealthRouter(pool));
  registerRoutes?.(api);
  app.use("/api", api);
  app.use("/api", notFound);
  app.use(errorHandler);

  return app;
}
