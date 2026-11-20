import { describe, expect, test } from "vitest";
import { parseEnv } from "./env.ts";

const DATABASE_URL = "postgresql://writechart:secret@127.0.0.1:5432/writechart";

function failedKeys(source: Record<string, string | undefined>): string[] {
  const result = parseEnv(source);
  if (result.success) throw new Error("expected parseEnv to fail");
  return result.error.issues.map((issue) => issue.path.join("."));
}

describe("parseEnv", () => {
  test("applies defaults", () => {
    const result = parseEnv({ DATABASE_URL });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: 3000,
      DATABASE_URL,
      LOG_LEVEL: "info",
    });
  });

  test("treats empty strings as unset", () => {
    const result = parseEnv({ DATABASE_URL, HOST: "", PORT: "", LOG_LEVEL: "" });
    expect(result.data).toMatchObject({ HOST: "127.0.0.1", PORT: 3000, LOG_LEVEL: "info" });
  });

  test("reads PORT from a string", () => {
    expect(parseEnv({ DATABASE_URL, PORT: "8080" }).data?.PORT).toBe(8080);
  });

  test("fails without DATABASE_URL", () => {
    expect(failedKeys({})).toEqual(["DATABASE_URL"]);
  });

  test("fails on a non-postgres DATABASE_URL", () => {
    expect(failedKeys({ DATABASE_URL: "mysql://localhost/db" })).toEqual(["DATABASE_URL"]);
  });

  test("fails on a bad PORT", () => {
    expect(failedKeys({ DATABASE_URL, PORT: "abc" })).toEqual(["PORT"]);
    expect(failedKeys({ DATABASE_URL, PORT: "70000" })).toEqual(["PORT"]);
  });
});
