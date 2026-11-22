// Проверка, что TypeScript и Vitest настроены. Удалить, когда появится первый код ядра с тестом.
import { expect, test } from "vitest";

test("toolchain works", () => {
  const sum: number = 1 + 1;
  expect(sum).toBe(2);
});
