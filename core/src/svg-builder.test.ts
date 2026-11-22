import { describe, expect, test } from "vitest";
import { el, formatNumber, serialize, showDirectionMarks } from "./svg-builder.ts";

/** U+202E RIGHT-TO-LEFT OVERRIDE: в исходнике только кодом, чтобы его было видно. */
const rlo = String.fromCodePoint(0x202e);
const replacement = String.fromCodePoint(0xfffd);

describe("строитель SVG", () => {
  test("собирает элемент с атрибутами и текстом", () => {
    const svg = el("svg", { xmlns: "http://www.w3.org/2000/svg", width: "10mm" }, [
      el("text", { x: 1, y: 2.345 }, ["Начало"]),
    ]);
    expect(serialize(svg)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10mm"><text x="1" y="2.35">Начало</text></svg>',
    );
  });

  test("тег script в тексте остаётся текстом", () => {
    const markup = serialize(el("text", {}, ["<script>alert(1)</script>"]));
    expect(markup).toBe("<text>&lt;script&gt;alert(1)&lt;/script&gt;</text>");
    expect(markup).not.toContain("<script");
  });

  test("выйти из атрибута нельзя", () => {
    const markup = serialize(el("g", { "data-block-id": '"><svg onload=alert(1)>' }, ["'\"&"]));
    expect(markup).toBe(
      '<g data-block-id="&quot;&gt;&lt;svg onload=alert(1)&gt;">&#39;&quot;&amp;</g>',
    );
    expect(markup.match(/</g)).toHaveLength(2);
  });

  test.each(["script", "foreignObject", "a", "image", "use", "style"])(
    "элемент %s — исключение",
    (name) => {
      expect(() => el(name as "g", {}, [])).toThrow();
    },
  );

  test.each(["onload", "onclick", "href", "xlink:href", "style", "class"])(
    "атрибут %s — исключение",
    (name) => {
      expect(() => el("g", { [name]: "x" } as Record<string, string>, [])).toThrow();
    },
  );

  test("ребёнок не из строителя — исключение", () => {
    expect(() => el("g", {}, [{ markup: "<script/>" } as never])).toThrow();
  });

  test("символ U+202E показывается меткой, порядок текста не меняется", () => {
    expect(serialize(el("text", {}, [`ab${rlo}cd`]))).toBe("<text>ab⟨U+202E⟩cd</text>");
  });

  test.each(
    ["0x202a", "0x202b", "0x202c", "0x202d", "0x2066", "0x2067", "0x2068", "0x2069"].map((code) =>
      String.fromCodePoint(Number(code)),
    ),
  )("символ направления %j заменяется меткой", (char) => {
    const label = `⟨U+${char.codePointAt(0)?.toString(16).toUpperCase()}⟩`;
    expect(showDirectionMarks(`x${char}y`)).toBe(`x${label}y`);
  });

  test("символы, запрещённые в XML, заменяются", () => {
    expect(serialize(el("text", {}, ["a\u0000b\u0007c"]))).toBe(
      `<text>a${replacement}b${replacement}c</text>`,
    );
  });

  test("числа округляются до 0,01 без -0", () => {
    expect([
      formatNumber(1.006),
      formatNumber(-0.001),
      formatNumber(12),
      formatNumber(0.1 + 0.2),
    ]).toEqual(["1.01", "0", "12", "0.3"]);
  });
});
