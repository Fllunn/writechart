import { describe, expect, test } from "vitest";
import type { Drawing, FlowLine, Shape } from "./drawing.ts";
import { gostCheck, type GostRule } from "./gost-check.ts";
import { convertPython } from "./languages/python.ts";
import { layout } from "./layout.ts";
import { labExamples, scenarioExamples } from "./test-support/examples.ts";
import { parsePython } from "./test-support/parse-python.ts";

async function drawingOf(code: string): Promise<Drawing> {
  const result = convertPython(await parsePython(code));
  if (!result.ok) throw new Error(result.errors.map((e) => e.message).join("\n"));
  return layout(result.program);
}

const rules = (drawing: Drawing): GostRule[] => [...new Set(gostCheck(drawing).map((v) => v.rule))];

describe("на всех примерах — ноль нарушений", () => {
  test.each(Object.entries({ ...scenarioExamples, ...labExamples }))("%s", async (_name, code) => {
    expect(gostCheck(await drawingOf(code))).toEqual([]);
  });
});

describe("находит каждое правило на испорченном чертеже", () => {
  const base = drawingOf(
    "x = int(input())\nwhile x > 0:\n    if x % 2 == 0:\n        print(x)\n    x -= 1\n",
  );

  const mapShape = (drawing: Drawing, index: number, change: (shape: Shape) => Shape): Drawing => ({
    ...drawing,
    shapes: drawing.shapes.map((shape, i) => (i === index ? change(shape) : shape)),
  });
  const mapLine = (
    drawing: Drawing,
    index: number,
    change: (line: FlowLine) => FlowLine,
  ): Drawing => ({
    ...drawing,
    lines: drawing.lines.map((line, i) => (i === index ? change(line) : line)),
  });
  const decisionIndex = (drawing: Drawing) =>
    drawing.shapes.findIndex((shape) => shape.kind === "decision");

  test("запрещённый символ", async () => {
    const drawing = mapShape(await base, 1, (shape) => ({
      ...shape,
      kind: "document" as Shape["kind"],
    }));
    expect(rules(drawing)).toContain("allowed-symbol");
  });

  test("блок уже минимальной ширины", async () => {
    expect(rules(mapShape(await base, 1, (shape) => ({ ...shape, width: 20 })))).toContain(
      "symbol-size",
    );
  });

  test("ромб с прежней пропорцией 2 : 1 отклоняется", async () => {
    const drawing = await base;
    const spoiled = mapShape(drawing, decisionIndex(drawing), (shape) => ({
      ...shape,
      width: 2 * shape.height,
    }));
    expect(rules(spoiled)).toContain("symbol-size");
  });

  test("ромбы разного размера отклоняются при правильной пропорции", async () => {
    const drawing = await base;
    const spoiled = mapShape(drawing, decisionIndex(drawing), (shape) => ({
      ...shape,
      width: shape.width * 1.25,
      height: shape.height * 1.25,
    }));
    expect(rules(spoiled)).toContain("symbol-size");
  });

  test("соседние блоки одной оси разной ширины", async () => {
    expect(
      rules(mapShape(await base, 1, (shape) => ({ ...shape, width: shape.width + 3 }))),
    ).toContain("column-width");
  });

  test("блоки разной высоты", async () => {
    expect(
      rules(mapShape(await base, 1, (shape) => ({ ...shape, height: shape.height + 2 }))),
    ).toContain("block-height");
  });

  test("у ромба не два выхода «да» и «нет»", async () => {
    const drawing = await base;
    const decision = drawing.shapes[decisionIndex(drawing)];
    const noIndex = drawing.lines.findIndex(
      (line) => line.from === decision?.id && line.exit === "нет",
    );
    expect(rules(mapLine(drawing, noIndex, ({ exit: _exit, ...line }) => line))).toContain(
      "decision-exits",
    );
  });

  test("у фигуры нет входа", async () => {
    const drawing = await base;
    const target = drawing.shapes[1]?.id;
    const spoiled = { ...drawing, lines: drawing.lines.filter((line) => line.to !== target) };
    expect(rules(spoiled)).toContain("has-entry");
  });

  test("у фигуры нет выхода", async () => {
    const drawing = await base;
    const target = drawing.shapes[1]?.id;
    const spoiled = { ...drawing, lines: drawing.lines.filter((line) => line.from !== target) };
    expect(rules(spoiled)).toContain("has-exit");
  });

  test("косая линия", async () => {
    const drawing = mapLine(await base, 0, (line) => ({
      ...line,
      points: line.points.map((p, i) => (i === 0 ? { x: p.x + 3, y: p.y } : p)),
    }));
    expect(rules(drawing)).toContain("orthogonal-lines");
  });

  test("стрелка не по правилу", async () => {
    expect(
      rules(
        mapLine(await base, 0, (line) => ({ ...line, arrows: line.arrows.length > 0 ? [] : [1] })),
      ),
    ).toContain("arrows");
  });

  test("фигуры пересекаются", async () => {
    const drawing = await base;
    const first = drawing.shapes[0];
    expect(
      rules(mapShape(drawing, 1, (shape) => ({ ...shape, y: first?.y ?? shape.y }))),
    ).toContain("shapes-overlap");
  });

  test("линия проходит через фигуру", async () => {
    const drawing = await base;
    const shape = drawing.shapes[1];
    if (!shape) throw new Error("нет фигуры");
    const through: FlowLine = {
      points: [
        { x: shape.x - 2, y: shape.y + shape.height / 2 },
        { x: shape.x + shape.width + 2, y: shape.y + shape.height / 2 },
      ],
      arrows: [],
    };
    expect(rules({ ...drawing, lines: [...drawing.lines, through] })).toContain(
      "line-through-shape",
    );
  });

  test("текст не помещается", async () => {
    const drawing = mapShape(await base, 1, (shape) => ({
      ...shape,
      lines: [[{ kind: "text", text: "очень длинная строка, которая не влезет в символ" }]],
    }));
    expect(rules(drawing)).toContain("text-fits");
  });
});
