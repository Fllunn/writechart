import { expect, test } from "vitest";
import { parsePython } from "./parse-python.ts";

test("грамматика Python загружается и разбирает присваивание", async () => {
  const root = await parsePython("x = 1");
  expect(root.type).toBe("module");
  expect(root.hasError).toBe(false);
  expect(root.namedChildren[0]?.namedChildren[0]?.type).toBe("assignment");
});
