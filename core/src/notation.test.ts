import { describe, expect, test } from "vitest";
import { convertPython } from "./languages/python.ts";
import type { Text } from "./structure.ts";
import { parsePython } from "./test-support/parse-python.ts";
import { plainText } from "./test-support/plain-text.ts";

/** Текст первого блока программы. */
async function firstText(code: string): Promise<Text> {
  const result = convertPython(await parsePython(code));
  if (!result.ok) throw new Error(result.errors.map((e) => e.message).join("\n"));
  const [step] = result.program.body;
  if (!step) throw new Error("нет шагов");
  if (step.kind === "if" || step.kind === "while") return step.condition;
  if (step.kind === "unsupported") throw new Error(step.firstLine);
  return step.text;
}

const condition = async (code: string) => plainText(await firstText(`if ${code}:\n    pass`));
const value = async (code: string) => plainText(await firstText(`y = ${code}`));

describe("таблица записи", () => {
  test.each([
    ["a == b", "a = b"],
    ["a != b", "a ≠ b"],
    ["a <= b", "a ≤ b"],
    ["a >= b", "a ≥ b"],
    ["a < b", "a < b"],
    ["a > b", "a > b"],
    ["a % b", "a mod b"],
    ["a and b", "a И b"],
    ["a or b", "a ИЛИ b"],
    ["not a", "НЕ a"],
    ["True", "истина"],
    ["False", "ложь"],
  ])("условие %s → %s", async (code, text) => {
    expect(await condition(code)).toBe(text);
  });

  test.each([
    ["n // 10", "⌊n / 10⌋"],
    ["a * b", "a · b"],
    ["a + b - c / d", "a + b - c / d"],
    ["x ** 2", "x^{2}"],
  ])("выражение %s → %s", async (code, text) => {
    expect(await value(code)).toBe(`y = ${text}`);
  });

  test("условие с остатком и логикой", async () => {
    expect(await condition("i % 2 == 0 and n != 0")).toBe("i mod 2 = 0 И n ≠ 0");
  });

  test("цепочка сравнений — один узел", async () => {
    expect(await condition("0 < i <= n")).toBe("0 < i ≤ n");
  });

  test("присваивание остаётся «=», сравнение в нём — в скобках", async () => {
    expect(plainText(await firstText("flag = a == b"))).toBe("flag = (a = b)");
  });

  test("степень со сложным показателем: x и надстрочный n + 1", async () => {
    expect(await firstText("y = x ** (n + 1)")).toEqual([
      { kind: "text", text: "y = x" },
      { kind: "sup", text: "n + 1" },
    ]);
  });

  test("степень в показателе степени", async () => {
    expect(await value("2 ** n ** 2")).toBe("y = 2^{n^2}");
  });

  test("строка в выражении — в «ёлочках»", async () => {
    expect(await firstText('name = "Иван"')).toEqual([
      { kind: "text", text: "name = " },
      { kind: "quoted", text: "Иван" },
    ]);
  });

  test("скобки из кода сохраняются", async () => {
    expect(await value("(a + b) * c")).toBe("y = (a + b) · c");
  });

  test("вызов функции внутри выражения", async () => {
    expect(await value("abs(a - b) // 2")).toBe("y = ⌊abs(a - b) / 2⌋");
  });

  test("целочисленное деление внутри условия", async () => {
    expect(await condition("n // 10 > 0")).toBe("⌊n / 10⌋ > 0");
  });
});
