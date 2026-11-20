import { pino } from "pino";
import type { LevelWithSilent, Logger } from "pino";

export type { Logger };

export function createLogger(options: { level: LevelWithSilent; pretty: boolean }): Logger {
  return pino({
    level: options.level,
    // pino-pretty работает в отдельном потоке; только в dev (ADR-0015).
    ...(options.pretty ? { transport: { target: "pino-pretty" } } : {}),
  });
}
