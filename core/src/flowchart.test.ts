import { describe, expect, test } from "vitest";
import { flowchart } from "./flowchart.ts";
import { layout } from "./layout.ts";
import { renderSvg } from "./render-svg.ts";
import { parsePython } from "./test-support/parse-python.ts";

async function build(code: string) {
  return flowchart(await parsePython(code));
}

async function svgOf(code: string): Promise<string> {
  const result = await build(code);
  if (result.svg === null) throw new Error(result.errors.map((e) => e.message).join("\n"));
  return result.svg;
}

/** Текст схемы без тегов: строки одного блока склеены. */
const textContent = (svg: string) => svg.replace(/<[^>]+>/g, "");

const allowedElements = new Set(["svg", "g", "rect", "path", "polygon", "text", "tspan"]);

describe("flowchart", () => {
  test("генерация детерминирована: один код — один SVG", async () => {
    const code =
      "n = int(input())\ni = 1\nwhile i <= n:\n    if i % 2 == 0:\n        print(i)\n    i += 1";
    expect(await svgOf(code)).toBe(await svgOf(code));
  });

  test("размеры в мм, viewBox в тех же единицах: 15 мм символа — 15 мм на листе", async () => {
    const svg = await svgOf("x = 1");
    const match = svg.match(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="([\d.]+)mm" height="([\d.]+)mm" viewBox="0 0 ([\d.]+) ([\d.]+)"/,
    );
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(match?.[3]);
    expect(match?.[2]).toBe(match?.[4]);
  });

  test("терминатор — путь из двух прямых и двух полуокружностей", async () => {
    const svg = await svgOf("");
    const paths = [...svg.matchAll(/<g data-block-id="b\d+"><g [^>]*><path d="([^"]+)"/g)].map(
      (m) => m[1] ?? "",
    );
    expect(paths).toHaveLength(2);
    for (const d of paths) {
      expect(d).toMatch(
        /^M [\d.]+ [\d.]+ H [\d.]+ A ([\d.]+) \1 0 0 1 [\d.]+ [\d.]+ H [\d.]+ A \1 \1 0 0 1 [\d.]+ [\d.]+ Z$/,
      );
    }
  });

  test("в схеме текст «Начало», «Конец», «да», «нет»", async () => {
    const svg = await svgOf("if x > 0:\n    print(x)");
    for (const text of [">Начало<", ">Конец<", ">да<", ">нет<"]) expect(svg).toContain(text);
  });

  test("стрелка classic заканчивается у центра стыка, линия — у выреза", () => {
    const drawing = layout({ body: [] }, { strokeWidth: 1 });
    const svg = renderSvg({
      ...drawing,
      width: 40,
      height: 40,
      lines: [
        {
          points: [
            { x: 20, y: 20 },
            { x: 10, y: 20 },
            { x: 10, y: 10 },
            { x: 20, y: 10 },
          ],
          arrows: [1, 2],
        },
        {
          points: [
            { x: 30, y: 15 },
            { x: 20, y: 15 },
          ],
          arrows: [1],
        },
        {
          points: [
            { x: 20, y: 15 },
            { x: 20, y: 25 },
          ],
          arrows: [],
        },
      ],
    });

    expect(svg).toContain('<g fill="none" stroke="#000" stroke-width="1">');
    expect(svg).toContain(
      '<path d="M 20 20 L 16.37 20 M 10 20 L 10 16.37 M 10 10 L 20 10" stroke-linecap="butt">',
    );
    expect(svg).toContain('<path d="M 30 15 L 26.37 15" stroke-linecap="butt">');
    expect(svg).toContain('<path d="M 20 15 L 20 25" stroke-linecap="butt">');

    const arrows = Array.from(
      svg.matchAll(/<polygon points="([^"]+)" fill="#000" stroke-miterlimit="10">/g),
      (match) => match[1],
    );

    expect(arrows).toEqual([
      "11.12,20 18.12,16.5 16.37,20 18.12,23.5",
      "10,11.12 13.5,18.12 10,16.37 6.5,18.12",
      "21.12,15 28.12,11.5 26.37,15 28.12,18.5",
    ]);
  });

  test("надстрочный текст — tspan с baseline-shift super", async () => {
    expect(await svgOf("y = x ** (n + 1)")).toMatch(
      /<tspan baseline-shift="super" font-size="[\d.]+">n \+ 1<\/tspan>/,
    );
  });

  test("ошибка в коде — ошибки и нет схемы", async () => {
    const result = await build("if x > 0\n    print(x)");
    expect(result.svg).toBeNull();
    expect(result.errors.map((e) => e.message)).toEqual(["Строка 1: не хватает «:»"]);
  });

  test("неподдерживаемая конструкция — схема и предупреждение", async () => {
    const result = await build("x = 1\nfor i in range(n):\n    print(i)");
    expect(textContent(result.svg ?? "")).toMatch(/пока не\s*поддерживается/);
    expect(result.svg).toContain('stroke-dasharray="');
    expect(result.warnings.map((w) => w.message)).toEqual(["Строка 2: for пока не поддерживается"]);
  });
});

describe("SVG безопасен", () => {
  test("тег script в коде виден как текст", async () => {
    const svg = await svgOf('print("<script>alert(1)</script>")');
    expect(textContent(svg)).toContain("«&lt;script&gt;alert(1)&lt;/script&gt;»");
    expect(svg).not.toMatch(/<script/i);
  });

  test("попытка выйти из атрибута: нет on* и лишних элементов", async () => {
    const svg = await svgOf(
      's = "\\"><svg onload=alert(1)>"\nprint(s, "\\"><svg onload=alert(1)>")',
    );
    // Текст экранирован: `onload=` в тексте блока остаётся текстом, атрибутов on* нет.
    const attributes = [...svg.matchAll(/\s([\w:-]+)="/g)].map((m) => m[1] ?? "");
    expect(attributes.filter((name) => /^on/i.test(name))).toEqual([]);
    expect(svg.match(/<svg/g)).toHaveLength(1);
  });

  test.each([
    'print("<img src=x onerror=alert(1)>")',
    "x = '<foreignObject><a href=\"javascript:alert(1)\">x</a></foreignObject>'",
    'print("]]><![CDATA[<script>")',
  ])("только разрешённые элементы, без ссылок: %s", async (code) => {
    const svg = await svgOf(code);
    const tags = new Set([...svg.matchAll(/<\/?([A-Za-z][\w:-]*)/g)].map((m) => m[1]));
    for (const tag of tags) expect(allowedElements.has(tag ?? "")).toBe(true);
    // Текст экранирован, поэтому `<` и `"` в разметке — только настоящие теги и атрибуты.
    const attributes = new Set([...svg.matchAll(/\s([\w:-]+)="/g)].map((m) => m[1]));
    for (const name of attributes) expect(name).not.toMatch(/^on|href|^style$/i);
    expect(svg).not.toMatch(/url\(|<!|<\?/i);
  });

  test("символ U+202E в строке — видимая метка", async () => {
    const svg = await svgOf('print("ab\u202Ecd")');
    expect(svg).toContain("ab⟨U+202E⟩cd");
    expect(svg).not.toContain("\u202E");
  });
});
