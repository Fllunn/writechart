import { z } from "zod";

/** `GET /api/health`: процесс жив, база не проверяется. */
export const HealthResponse = z.strictObject({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof HealthResponse>;

/** `GET /api/health/ready`: 200 — база ответила, 503 — нет. */
export const ReadyResponse = z.union([
  z.strictObject({ status: z.literal("ok"), db: z.literal("ok") }),
  z.strictObject({ status: z.literal("error"), db: z.literal("error") }),
]);
export type ReadyResponse = z.infer<typeof ReadyResponse>;
