import { describe, expect, test } from "vitest";
import { flowchart } from "./flowchart.ts";
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

  test("стрелка острая, линия кончается у её основания, вершина — на дальнем краю линии стыка", async () => {
    const svg = await svgOf("while i <= n:\n    if i % 2 == 0:\n        i += 1\n    i += 1");
    const strokeWidth = Number(svg.match(/stroke-width="([\d.]+)" stroke-linecap/)?.[1]);
    const arrows = [...svg.matchAll(/<polygon points="([^"]+)" fill="#222" stroke="none">/g)].map(
      (m) => (m[1] ?? "").split(" ").map((pair) => pair.split(",").map(Number)),
    );
    expect(arrows.length).toBeGreaterThan(0);
    const vertices = new Set(
      [...svg.matchAll(/<path d="([^"]+)"/g)].flatMap((m) =>
        [...(m[1] ?? "").matchAll(/[ML] ([\d.]+) ([\d.]+)/g)].map(
          (p) => `${Number(p[1])},${Number(p[2])}`,
        ),
      ),
    );
    const key = (x: number, y: number) =>
      `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
    for (const points of arrows) {
      expect(points).toHaveLength(3);
      const [[tx = 0, ty = 0] = [], [b1x = 0, b1y = 0] = [], [b2x = 0, b2y = 0] = []] = points;
      const [bx, by] = [(b1x + b2x) / 2, (b1y + b2y) / 2];
      // Линия доходит ровно до основания стрелки и не идёт под треугольником.
      expect(vertices.has(key(bx, by))).toBe(true);
      // Стык (откуда идёт линия дальше) — на пол-линии позади вершины: вершина на дальнем
      // краю линии стыка, не дальше и не ближе.
      const length = Math.hypot(tx - bx, ty - by);
      const [ux, uy] = [(tx - bx) / length, (ty - by) / length];
      expect(vertices.has(key(tx - (ux * strokeWidth) / 2, ty - (uy * strokeWidth) / 2))).toBe(
        true,
      );
    }
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
