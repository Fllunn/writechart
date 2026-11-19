// Проверка, что TypeScript и Vitest настроены. Удалить, когда в shared появится первая схема с тестом.
import { expect, test } from "vitest";

test("toolchain works", () => {
  const sum: number = 1 + 1;
  expect(sum).toBe(2);
});
