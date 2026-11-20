import { ReadyResponse } from "@writechart/shared/health";
import { expect, test } from "@playwright/test";

// Запрос идёт на адрес фронта: проверяем цепочку прокси preview → бэк → база.
test("/api/health/ready через фронт отвечает 200", async ({ request }) => {
  const response = await request.get("/api/health/ready");

  expect(response.status()).toBe(200);
  expect(ReadyResponse.parse(await response.json())).toEqual({ status: "ok", db: "ok" });
});
