import { describe, expect, test } from "vitest";
import { tinos } from "./fonts/tinos.ts";
import { joinText } from "./notation.ts";
import {
  blockHeight,
  blockWidth,
  dataSkew,
  decisionSize,
  lineWidth,
  symbolLines,
  symbolRules,
  textFits,
  wrapBalanced,
  wrapText,
  type TextLine,
  type TextStyle,
} from "./symbols.ts";

const k = 3.5;
const style: TextStyle = { font: tinos, size: k, lineHeight: 1.25 * k, supScale: 0.7 };
const rules = symbolRules(k);
const plain = (lines: readonly TextLine[]) =>
  lines.map((line) => line.map((part) => part.text).join(""));

describe("размеры символов подстраиваются под текст", () => {
  test("короткий текст — минимальная ширина", () => {
    const lines = symbolLines("process", joinText("x = 1"), style, rules);
    expect(blockWidth("process", lines, rules.blockMinHeight, style, rules)).toBe(rules.minWidth);
  });

  test("текст шире минимума — ширина растёт по тексту с полями", () => {
    const text = joinText("summa = summa + element · koefficient");
    const lines = symbolLines("process", text, style, rules);
    expect(lines).toHaveLength(1);
    const width = blockWidth("process", lines, rules.blockMinHeight, style, rules);
    expect(width).toBeGreaterThan(rules.minWidth);
    expect(width).toBeCloseTo(lineWidth(lines[0] ?? [], style) + 2 * rules.paddingX);
  });

  test("длинный текст переносится на строки примерно равной длины", () => {
    const text = joinText(
      "Сумма элементов массива, которые делятся на три без остатка и больше нуля",
    );
    const lines = symbolLines("data", text, style, rules);
    expect(lines.length).toBe(2);
    const [first, second] = lines.map((line) => lineWidth(line, style));
    expect(Math.abs((first ?? 0) - (second ?? 0))).toBeLessThan(15);
    for (const line of lines)
      expect(lineWidth(line, style)).toBeLessThanOrEqual(rules.maxLineWidth);
  });

  test("минимальная высота блоков — 40 px, многострочный текст увеличивает её", () => {
    expect(blockHeight([[]], style, rules)).toBeCloseTo((40 / 12) * k);
    expect(blockHeight([[], []], style, rules)).toBeGreaterThan(rules.blockMinHeight);
  });

  test("скос параллелограмма занимает 23 % ширины, текст помещается", () => {
    const lines = symbolLines("data", joinText("Вывод: «Сумма цифр числа:», s"), style, rules);
    const h = rules.blockMinHeight;
    const width = blockWidth("data", lines, h, style, rules);
    expect(dataSkew(100)).toBeCloseTo(23);
    expect(width).toBeCloseTo(
      (Math.max(...lines.map((line) => lineWidth(line, style))) + 2 * rules.paddingX) / 0.54,
    );
    expect(textFits("data", width, h, lines, style, rules)).toBe(true);
  });

  test("ромб имеет пропорцию 1,86 : 1 и растёт по тексту", () => {
    const short = symbolLines("decision", joinText("i ≤ n"), style, rules);
    const minimum = decisionSize(short, style, rules);
    expect(minimum.width).toBeCloseTo(9.3 * k);
    expect(minimum.height).toBeCloseTo(5 * k);

    const long = symbolLines(
      "decision",
      joinText("y mod 4 = 0 И (y mod 100 ≠ 0 ИЛИ y mod 400 = 0)"),
      style,
      rules,
    );
    expect(long.length).toBeGreaterThan(1);
    const size = decisionSize(long, style, rules);
    expect(size.width).toBeCloseTo(1.86 * size.height);
    expect(textFits("decision", size.width, size.height, long, style, rules)).toBe(true);
  });

  test("размеры от кегля: вдвое больший кегль — вдвое больше минимумы", () => {
    const big = symbolRules(2 * k);
    expect(big.minWidth).toBeCloseTo(2 * rules.minWidth);
    expect(big.blockMinHeight).toBeCloseTo(2 * rules.blockMinHeight);
  });
});

describe("перенос текста", () => {
  test("слово длиннее строки режется по буквам", () => {
    const lines = wrapText(joinText("x".repeat(80)), 30, style);
    expect(lines.length).toBeGreaterThan(1);
    expect(plain(lines).join("")).toBe("x".repeat(80));
  });

  test("ровный перенос не добавляет строк", () => {
    const text = joinText("a b c d e f g h i j k l m n o p q r s t u v w x y z");
    expect(wrapBalanced(text, 20, style).length).toBe(wrapText(text, 20, style).length);
  });

  test("надстрочный текст не отрывается от основания", () => {
    const lines = wrapText(
      [
        { kind: "text", text: "y = x" },
        { kind: "sup", text: "n + 1" },
      ],
      100,
      style,
    );
    expect(lines).toEqual([
      [
        { kind: "text", text: "y = x" },
        { kind: "sup", text: "n + 1" },
      ],
    ]);
  });

  test("строка в «ёлочках» и принудительный перенос", () => {
    const lines = wrapText(
      [{ kind: "quoted", text: "a" }, { kind: "break" }, { kind: "text", text: "b" }],
      100,
      style,
    );
    expect(lines).toEqual([[{ kind: "text", text: "«a»" }], [{ kind: "text", text: "b" }]]);
  });

  test("символ направления текста меряется как видимая метка", () => {
    const lines = wrapText(joinText(`a${String.fromCodePoint(0x202e)}b`), 100, style);
    expect(lines).toEqual([[{ kind: "text", text: "a⟨U+202E⟩b" }]]);
  });
});
