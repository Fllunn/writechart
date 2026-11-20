// До тестов проверяет, что тестовая база есть и отвечает. Без неё тесты падают, а не пропускаются.
import pg from "pg";
import type { TestProject } from "vitest/node";

const HINT = "Скопируй .env.example в .env и запусти docker compose up -d.";

export async function setup(project: TestProject): Promise<void> {
  const url = project.config.env["DATABASE_URL_TEST"];
  if (!url) {
    throw new Error(`DATABASE_URL_TEST не задана. ${HINT}`);
  }

  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    // ECONNREFUSED на ::1 и 127.0.0.1 приходит как AggregateError с пустым message.
    const reason =
      error instanceof Error
        ? error.message || ("code" in error ? String(error.code) : error.name)
        : String(error);
    throw new Error(`Тестовая база по DATABASE_URL_TEST не отвечает (${reason}). ${HINT}`);
  } finally {
    await pool.end();
  }
}
