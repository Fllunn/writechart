import { describe, expect, test } from "vitest";
import type { Drawing, FlowLine, Point, Shape } from "./drawing.ts";
import { convertPython } from "./languages/python.ts";
import { layout, type LayoutOptions } from "./layout.ts";
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
    expect(drawing.lines[0]).toMatchObject({
      from: start.id,
      to: shape(drawing, "Конец").id,
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

  test("фигуры стоят на одной оси, между ними 1,2 кегля", async () => {
    const drawing = await drawingOf("x = 1\ny = 2");
    const [a, b] = [shape(drawing, "x = 1"), shape(drawing, "y = 2")];
    expect(centerX(a)).toBe(centerX(b));
    expect(b.y - bottom(a)).toBeCloseTo(1.2 * 3.5);
  });

  test("колонка одной ширины: блоки и терминаторы одной оси — по самому широкому", async () => {
    const drawing = await drawingOf(
      'n = int(input())\ns = 0\nprint("Сумма элементов массива:", s)',
    );
    const widths = drawing.shapes.map((s) => s.width);
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
    expect(body.y).toBeGreaterThan(bottom(decision));
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
});

describe("цикл while", () => {
  test("простой цикл: тело под ромбом, возврат слева вверх в линию над ромбом, «нет» справа вниз", async () => {
    const drawing = await drawingOf("while i <= n:\n    i = i + 1\nprint(i)");
    const decision = shape(drawing, "i ≤ n");
    const body = shape(drawing, "i = i + 1");
    expect(centerX(body)).toBe(centerX(decision));
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
