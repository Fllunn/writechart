import pg from "pg";

export type { Pool } from "pg";

export function createPool(connectionString: string): pg.Pool {
  // Без таймаута /api/health/ready ждал бы недоступную базу бесконечно.
  return new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
}
