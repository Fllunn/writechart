import { Writable } from "node:stream";
import { HealthResponse, ReadyResponse } from "@writechart/shared/health";
import pg from "pg";
import { pino } from "pino";
import request from "supertest";
import { afterAll, describe, expect, test } from "vitest";
import { createApp } from "../../app.ts";
import { createPool } from "../../lib/db.ts";
import { createLogger } from "../../lib/logger.ts";

const logger = createLogger({ level: "silent", pretty: false });

const livePool = createPool(process.env["DATABASE_URL_TEST"] ?? "");
// Закрытый порт: база «недоступна» без моков.
const deadPool = new pg.Pool({
  connectionString: "postgresql://writechart:writechart@127.0.0.1:1/writechart_test",
  connectionTimeoutMillis: 1000,
});

afterAll(async () => {
  await Promise.all([livePool.end(), deadPool.end()]);
});

describe("GET /api/health", () => {
  test("returns ok", async () => {
    const res = await request(createApp({ pool: livePool, logger })).get("/api/health");
    expect(res.status).toBe(200);
    expect(HealthResponse.parse(res.body)).toEqual({ status: "ok" });
  });

  test("returns ok when the database is down", async () => {
    const res = await request(createApp({ pool: deadPool, logger })).get("/api/health");
    expect(res.status).toBe(200);
    expect(HealthResponse.parse(res.body)).toEqual({ status: "ok" });
  });
});

describe("GET /api/health/ready", () => {
  test("returns ok when the database answers", async () => {
    const res = await request(createApp({ pool: livePool, logger })).get("/api/health/ready");
    expect(res.status).toBe(200);
    expect(ReadyResponse.parse(res.body)).toEqual({ status: "ok", db: "ok" });
  });

  test("returns 503 without the database error text", async () => {
    const res = await request(createApp({ pool: deadPool, logger })).get("/api/health/ready");
    expect(res.status).toBe(503);
    // strictObject в схеме: лишних полей (текста ошибки) в ответе нет.
    expect(ReadyResponse.parse(res.body)).toEqual({ status: "error", db: "error" });
  });
});

test("health requests are not logged", async () => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  const app = createApp({ pool: livePool, logger: pino({ level: "info" }, stream) });

  await request(app).get("/api/health");
  await request(app).get("/api/health/ready");
  expect(lines).toEqual([]);

  // Для сравнения: другой адрес в лог попадает.
  await request(app).get("/api/no-such-route");
  expect(lines.length).toBeGreaterThan(0);
});
