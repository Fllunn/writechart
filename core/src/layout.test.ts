import { describe, expect, test } from "vitest";
import type { Drawing, FlowLine, Point, Shape } from "./drawing.ts";
import { gostCheck } from "./gost-check.ts";
import { convertPython } from "./languages/python.ts";
import { defaultLayoutOptions, layout, type LayoutOptions } from "./layout.ts";
import { textFits } from "./symbols.ts";
import { parsePython } from "./test-support/parse-python.ts";

async function drawingOf(code: string, options?: Partial<LayoutOptions>): Promise<Drawing> {
  const result = convertPython(await parsePython(code));
  if (!result.ok) throw new Error(result.errors.map((e) => e.message).join("\n"));
  return layout(result.program, options);
}

const shapeText = (shape: Shape) =>
  shape.lines.map((line) => line.map((part) => part.text).join("")).join(" ");

function shape(drawing: Drawing, text: string): Shape {
  const found = drawing.shapes.find((s) => shapeText(s) === text);
  if (!found) throw new Error(`Нет фигуры «${text}»: ${drawing.shapes.map(shapeText).join(" | ")}`);
  return found;
}

const centerX = (s: Shape) => s.x + s.width / 2;
const centerY = (s: Shape) => s.y + s.height / 2;
const bottom = (s: Shape) => s.y + s.height;
const right = (s: Shape) => s.x + s.width;
const exitsOf = (drawing: Drawing, s: Shape) => drawing.lines.filter((line) => line.from === s.id);
const last = (line: FlowLine): Point => line.points.at(-1) ?? { x: NaN, y: NaN };

type Direction = "down" | "up" | "left" | "right";
function directions(line: FlowLine): Direction[] {
  return line.points.slice(1).map((point, i) => {
    const previous = line.points[i] ?? point;
    if (point.x > previous.x) return "right";
    if (point.x < previous.x) return "left";
    return point.y > previous.y ? "down" : "up";
  });
}

function exit(drawing: Drawing, s: Shape, label: "да" | "нет"): FlowLine {
  const found = exitsOf(drawing, s).find((line) => line.exit === label);
  if (!found) throw new Error(`У «${shapeText(s)}» нет выхода «${label}»`);
  return found;
}

/** Отрезки пересекаются крест-накрест (касание концами не считается). */
function crosses(a: [Point, Point], b: [Point, Point]): boolean {
  const [h, v] = a[0].y === a[1].y ? [a, b] : [b, a];
  if (h[0].y !== h[1].y || v[0].x !== v[1].x) return false;
  const [x1, x2] = [Math.min(h[0].x, h[1].x), Math.max(h[0].x, h[1].x)];
  const [y1, y2] = [Math.min(v[0].y, v[1].y), Math.max(v[0].y, v[1].y)];
  return v[0].x > x1 && v[0].x < x2 && h[0].y > y1 && h[0].y < y2;
}

const segments = (line: FlowLine) =>
  line.points.slice(1).map((point, i): [Point, Point] => [line.points[i] ?? point, point]);

describe("последовательность", () => {
  test("пустая программа: «Начало», линия, «Конец»", async () => {
    const drawing = await drawingOf("");
    expect(drawing.shapes.map(shapeText)).toEqual(["Начало", "Конец"]);
    expect(drawing.lines).toHaveLength(1);
    const start = shape(drawing, "Начало");
    const end = shape(drawing, "Конец");
    expect(start.height).toBeCloseTo(5 * 3.5);
    expect(end.height).toBeCloseTo(5 * 3.5);
    expect(drawing.lines[0]).toMatchObject({
      from: start.id,
      to: end.id,
      arrows: [],
    });
  });

  test("прямая линия вниз — вертикальная, без стрелки", async () => {
    const drawing = await drawingOf("x = 1\ny = 2");
    const line = exitsOf(drawing, shape(drawing, "x = 1"))[0];
    expect(line && directions(line)).toEqual(["down"]);
    expect(line?.arrows).toEqual([]);
    expect(line?.to).toBe(shape(drawing, "y = 2").id);
  });

  test("фигуры стоят на одной оси, между ними 1,4 кегля", async () => {
    const drawing = await drawingOf("x = 1\ny = 2");
    const [a, b] = [shape(drawing, "x = 1"), shape(drawing, "y = 2")];
    expect(centerX(a)).toBe(centerX(b));
    expect(b.y - bottom(a)).toBeCloseTo(1.4 * 3.5);
  });

  test("вертикальные промежутки масштабируются с кеглем", async () => {
    const style = { ...defaultLayoutOptions.style, size: 4 };
    const drawing = await drawingOf("x = 1\nx = 2\nif x > 0:\n    x = 3", { style });
    expect(shape(drawing, "x = 2").y - bottom(shape(drawing, "x = 1"))).toBeCloseTo(1.4 * 4);
    expect(shape(drawing, "x = 3").y - bottom(shape(drawing, "x > 0"))).toBeCloseTo(3.4 * 4);
  });

  test("прямоугольники на оси ввода и вывода выровнены по серединам скосов", async () => {
    const drawing = await drawingOf(
      "n = int(input())\ns = 0\nwhile n > 0:\n    s += n\n    n -= 1\nprint(s)",
    );
    const input = shape(drawing, "Ввод n");
    const halfSkew = (0.23 * input.width) / 2;
    for (const text of ["s = 0", "s = s + n", "n = n - 1"]) {
      const block = shape(drawing, text);
      expect(block.x).toBeCloseTo(input.x + halfSkew);
      expect(right(block)).toBeCloseTo(right(input) - halfSkew);
    }
    expect(shape(drawing, "Вывод: s").width).toBe(input.width);
    expect(shape(drawing, "Начало").width).toBe(input.width);
  });

  test("длинный текст в прямоугольнике расширяет параллелограмм на той же оси", async () => {
    const short = await drawingOf("n = int(input())\nx = n");
    const drawing = await drawingOf(
      "n = int(input())\nwhile n > 0:\n    very_long_total_name = count_value + next_count_value",
    );
    const input = shape(drawing, "Ввод n");
    const block = drawing.shapes.find((candidate) => candidate.kind === "process");
    if (!block) throw new Error("нет прямоугольника");
    expect(input.width).toBeGreaterThan(shape(short, "Ввод n").width);
    expect(block.width).toBeCloseTo(0.77 * input.width);
    expect(
      textFits(block.kind, block.width, block.height, block.lines, drawing.style, drawing.rules),
    ).toBe(true);
  });

  test("ось без параллелограмма получает общую ширину по самому широкому блоку", async () => {
    const drawing = await drawingOf("x = 1\ny = very_long_total_name + next_count_value");
    const widths = drawing.shapes.map((block) => block.width);
    expect(new Set(widths).size).toBe(1);
    expect(widths[0]).toBeGreaterThan(drawing.rules.minWidth);
  });

  test("процессы и данные одной высоты во всей схеме", async () => {
    const drawing = await drawingOf("x = 1\nif x:\n    print(x)\nelse:\n    y = 2");
    const blocks = drawing.shapes.filter((s) => s.kind === "process" || s.kind === "data");
    expect(new Set(blocks.map((s) => s.height)).size).toBe(1);
  });

  test("левый верхний край схемы у поля", async () => {
    const drawing = await drawingOf("x = 1");
    expect(Math.min(...drawing.shapes.map((s) => s.x))).toBeCloseTo(1.5 * 3.5);
    expect(Math.min(...drawing.shapes.map((s) => s.y))).toBeCloseTo(1.5 * 3.5);
  });
});

describe("ветвление", () => {
  test("if без else: «да» вниз к телу, «нет» вправо и вниз в линию под ветвлением со стрелкой", async () => {
    const drawing = await drawingOf("if x > 0:\n    print(x)\ny = 1");
    const decision = shape(drawing, "x > 0");
    const body = shape(drawing, "Вывод: x");
    expect(decision.kind).toBe("decision");
    expect(centerX(body)).toBe(centerX(decision));
    expect(body.y - bottom(decision)).toBeCloseTo(3.4 * 3.5);
    const yes = exit(drawing, decision, "да");
    expect(yes.points[0]).toEqual({ x: centerX(decision), y: bottom(decision) });
    expect(yes.to).toBe(body.id);
    const no = exit(drawing, decision, "нет");
    expect(no.points[0]).toEqual({ x: right(decision), y: centerY(decision) });
    expect(directions(no)).toEqual(["right", "down", "left"]);
    expect(last(no).x).toBe(centerX(decision));
    expect(last(no).y).toBeGreaterThan(bottom(body));
    expect(no.arrows).toEqual([3]);
    expect(shape(drawing, "y = 1").y).toBeGreaterThan(last(no).y);
  });

  test("ветка «нет» с телом стоит правее ветки «да»", async () => {
    const drawing = await drawingOf("if a:\n    x = 1\nelse:\n    x = 2");
    const [yes, no] = [shape(drawing, "x = 1"), shape(drawing, "x = 2")];
    expect(no.x).toBeGreaterThan(right(yes));
    const merge = exitsOf(drawing, no)[0];
    expect(merge && directions(merge)).toEqual(["down", "left"]);
    expect(merge?.arrows).toEqual([2]);
  });

  test("if, elif, else: в ветке «нет» ромба a — ромб b со своей веткой «нет»", async () => {
    const drawing = await drawingOf("if a:\n    x = 1\nelif b:\n    x = 2\nelse:\n    x = 3");
    const [a, b] = [shape(drawing, "a"), shape(drawing, "b")];
    expect(exit(drawing, a, "нет").to).toBe(b.id);
    expect(b.x).toBeGreaterThan(right(a));
    expect(exit(drawing, b, "нет").to).toBe(shape(drawing, "x = 3").id);
    expect(shape(drawing, "x = 3").x).toBeGreaterThan(right(shape(drawing, "x = 2")));
  });

  test("подписи: у нижнего выхода «да», у правого «нет»", async () => {
    const drawing = await drawingOf("if x > 0:\n    print(x)");
    const decision = shape(drawing, "x > 0");
    expect(
      exitsOf(drawing, decision)
        .map((line) => line.exit ?? "")
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual(["да", "нет"]);
    const yes = drawing.labels.find((label) => label.text === "да");
    const no = drawing.labels.find((label) => label.text === "нет");
    expect(yes && yes.y > bottom(decision) && Math.abs(yes.x - centerX(decision)) < 3).toBe(true);
    expect(no && no.x >= right(decision) && no.y < centerY(decision)).toBe(true);
  });

  test("короткие условия дают одинаковые ромбы минимального размера", async () => {
    const drawing = await drawingOf("if a:\n    x = 1\nelse:\n    if b:\n        x = 2");
    const diamonds = drawing.shapes.filter((item) => item.kind === "decision");
    expect(diamonds).toHaveLength(2);
    for (const diamond of diamonds) {
      expect(diamond.width).toBeCloseTo(9.3 * 3.5);
      expect(diamond.height).toBeCloseTo(5 * 3.5);
    }
  });

  test("условия стартового примера дают ромбы 37,24 × 20,02 мм", async () => {
    const drawing = await drawingOf(
      "while i <= n:\n    if i % 2 == 0:\n        s += i\n    i += 1",
    );
    const diamonds = drawing.shapes.filter((item) => item.kind === "decision");
    expect(diamonds).toHaveLength(2);
    for (const diamond of diamonds) {
      expect(diamond.width).toBeCloseTo(37.24);
      expect(diamond.height).toBeCloseTo(20.02);
    }
    expect(gostCheck(drawing)).toEqual([]);
  });

  test("длинное условие в боковой ветке увеличивает все ромбы схемы", async () => {
    const drawing = await drawingOf(
      "while a:\n    if b:\n        x = 1\n    else:\n        if average_temperature > maximum_allowed_temperature:\n            x = 2",
    );
    const diamonds = drawing.shapes.filter((item) => item.kind === "decision");
    expect(diamonds).toHaveLength(3);
    expect(new Set(diamonds.map((item) => item.width)).size).toBe(1);
    expect(new Set(diamonds.map((item) => item.height)).size).toBe(1);
    for (const diamond of diamonds) {
      expect(diamond.height).toBeGreaterThan(5 * 3.5);
      expect(
        textFits(
          diamond.kind,
          diamond.width,
          diamond.height,
          diamond.lines,
          drawing.style,
          drawing.rules,
        ),
      ).toBe(true);
    }
  });
});

describe("цикл while", () => {
  test("простой цикл: тело под ромбом, возврат слева вверх в линию над ромбом, «нет» справа вниз", async () => {
    const drawing = await drawingOf("while i <= n:\n    i = i + 1\nprint(i)");
    const decision = shape(drawing, "i ≤ n");
    const body = shape(drawing, "i = i + 1");
    expect(centerX(body)).toBe(centerX(decision));
    expect(body.y - bottom(decision)).toBeCloseTo(3.4 * 3.5);
    expect(exit(drawing, decision, "да").to).toBe(body.id);

    const back = exitsOf(drawing, body)[0];
    if (!back) throw new Error("нет линии возврата");
    expect(directions(back)).toEqual(["down", "left", "up", "right"]);
    expect(last(back).x).toBe(centerX(decision));
    expect(last(back).y).toBeLessThan(decision.y);
    // Стрелки в конце отрезка влево и отрезка вверх; на входе вправо — нет.
    expect(back.arrows).toEqual([2, 3]);
    expect(Math.min(...back.points.map((p) => p.x))).toBeLessThan(decision.x);

    const no = exit(drawing, decision, "нет");
    expect(directions(no)).toEqual(["right", "down", "left"]);
    expect(last(no).x).toBe(centerX(decision));
    expect(last(no).y).toBeGreaterThan(Math.max(...back.points.map((p) => p.y)));
    expect(no.arrows).toEqual([3]);
    expect(shape(drawing, "Вывод: i").y).toBeGreaterThan(last(no).y);
  });

  test("вложенный цикл: возврат внешнего левее внутреннего на шаг, линии не пересекаются", async () => {
    const drawing = await drawingOf("while i < n:\n    while j < n:\n        j += 1\n    i += 1");
    const innerBack = exitsOf(drawing, shape(drawing, "j = j + 1"))[0];
    const outerBack = exitsOf(drawing, shape(drawing, "i = i + 1"))[0];
    if (!innerBack || !outerBack) throw new Error("нет линий возврата");
    const leftmost = (line: FlowLine) => Math.min(...line.points.map((p) => p.x));
    expect(leftmost(innerBack) - leftmost(outerBack)).toBeCloseTo(1.5 * 3.5);
    const all = drawing.lines.flatMap(segments);
    for (const [i, a] of all.entries())
      for (const b of all.slice(i + 1)) expect(crosses(a, b)).toBe(false);
  });
});

describe("правило стрелок — параметр", () => {
  test("своё правило ставит стрелки на все линии", async () => {
    const drawing = await drawingOf("x = 1", { arrowRule: () => true });
    expect(drawing.lines.every((line) => line.arrows.length === line.points.length - 1)).toBe(true);
  });
});

describe("неподдерживаемая конструкция", () => {
  test("процесс с пунктиром, первая строка и пометка", async () => {
    const drawing = await drawingOf("for i in range(n):\n    print(i)");
    const block = drawing.shapes.find((s) => s.dashed);
    expect(block?.kind).toBe("process");
    expect(block && shapeText(block)).toBe("for i in range(n): пока не поддерживается");
  });
});
