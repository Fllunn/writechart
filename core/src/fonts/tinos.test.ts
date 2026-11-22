import { describe, expect, test } from "vitest";
import { tinos } from "./tinos.ts";
import { textWidth } from "./font-metrics.ts";

const range = (from: string, to: string) =>
  Array.from({ length: (to.codePointAt(0) ?? 0) - (from.codePointAt(0) ?? 0) + 1 }, (_, i) =>
    String.fromCodePoint((from.codePointAt(0) ?? 0) + i),
  );

describe("таблица Tinos", () => {
  test.each([
    ...range("А", "я"),
    ...range("A", "Z"),
    ...range("a", "z"),
    ...range("0", "9"),
    ..."≤≥≠·⌊⌋«»⟨⟩".split(""),
  ])("есть символ %s", (char) => {
    expect(tinos.advances[char]).toBeGreaterThan(0);
  });

  test("ширина «Ввод n» совпадает с замером Chromium в пределах 2 %", () => {
    // canvas measureText("Ввод n") шрифтом 100px Tinos в Chromium (Playwright, 22.11.2026).
    const browserEm = 286.23046875 / 100;
    const tableEm = textWidth(tinos, "Ввод n", 1);
    expect(Math.abs(tableEm - browserEm) / browserEm).toBeLessThan(0.02);
  });

  test("символ не из таблицы считается шириной по умолчанию", () => {
    expect(textWidth(tinos, "\u{1F600}", 2048 / 10)).toBeCloseTo(tinos.defaultAdvance / 10);
  });
});
