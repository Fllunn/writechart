import type { HealthResponse, ReadyResponse } from "@writechart/shared/health";
import { Router } from "express";
import type { Pool } from "../../lib/db.ts";

export function createHealthRouter(pool: Pool): Router {
  const router = Router();

  // «Жив»: базу не трогает, иначе сбой базы привёл бы к перезапуску процесса.
  router.get("/health", (_req, res) => {
    res.json({ status: "ok" } satisfies HealthResponse);
  });

  // «Готов»: проверочный запрос к базе.
  router.get("/health/ready", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "ok" } satisfies ReadyResponse);
    } catch (error) {
      req.log.warn({ err: error }, "Database is not ready");
      res.status(503).json({ status: "error", db: "error" } satisfies ReadyResponse);
    }
  });

  return router;
}
