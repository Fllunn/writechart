import { ApiError, ValidationDetails } from "@writechart/shared/api-error";
import pg from "pg";
import request from "supertest";
import { afterAll, describe, expect, test } from "vitest";
import { z } from "zod";
import { createApp } from "./app.ts";
import { createLogger } from "./lib/logger.ts";

// Эти тесты базу не трогают; Pool без соединений ничего не открывает.
const pool = new pg.Pool({ connectionString: "postgresql://unused@127.0.0.1:1/unused" });
afterAll(() => pool.end());

const Body = z.object({ name: z.string().min(1) });

// Тестовые маршруты подключаются через registerRoutes, без моков.
const app = createApp({
  pool,
  logger: createLogger({ level: "silent", pretty: false }),
  registerRoutes: (router) => {
    router.post("/test/echo", (req, res) => {
      res.json(Body.parse(req.body));
    });
    router.get("/test/boom", async () => {
      throw new Error("secret detail");
    });
  },
});

function parseError(body: unknown): ApiError["error"] {
  return ApiError.parse(body).error;
}

describe("errors", () => {
  test("unknown API route → 404 not_found", async () => {
    const res = await request(app).get("/api/no-such-route");
    expect(res.status).toBe(404);
    expect(parseError(res.body).code).toBe("not_found");
  });

  test("body that fails the schema → 400 validation_failed with details", async () => {
    const res = await request(app).post("/api/test/echo").send({ name: 42 });
    expect(res.status).toBe(400);
    const error = parseError(res.body);
    expect(error.code).toBe("validation_failed");
    const details = ValidationDetails.parse(error.details);
    expect(details).toHaveLength(1);
    expect(details[0]?.path).toEqual(["name"]);
  });

  test("valid body passes the schema", async () => {
    const res = await request(app).post("/api/test/echo").send({ name: "ok" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: "ok" });
  });

  test("broken JSON → 400 invalid_json", async () => {
    const res = await request(app)
      .post("/api/test/echo")
      .set("Content-Type", "application/json")
      .send("{oops");
    expect(res.status).toBe(400);
    expect(parseError(res.body).code).toBe("invalid_json");
  });

  test("body over 100 KB → 413 payload_too_large", async () => {
    const res = await request(app)
      .post("/api/test/echo")
      .send({ name: "x".repeat(101 * 1024) });
    expect(res.status).toBe(413);
    expect(parseError(res.body).code).toBe("payload_too_large");
  });

  test("unexpected error → 500 internal_error without message or stack", async () => {
    const res = await request(app).get("/api/test/boom");
    expect(res.status).toBe(500);
    expect(parseError(res.body).code).toBe("internal_error");
    expect(res.text).not.toContain("secret detail");
    expect(res.text).not.toContain("app.test.ts");
    expect(res.text).not.toMatch(/\bat\s/);
  });
});

test("no X-Powered-By header", async () => {
  const res = await request(app).get("/api/health");
  expect(res.headers["x-powered-by"]).toBeUndefined();
});
