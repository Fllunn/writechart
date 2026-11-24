// Проверка чертежа по правилам ГОСТ 19.701-90 и вида схемы (design, решения 14, 19–21). Позже — функция продукта.
import {
  arrowOnLeftOrUp,
  arrowsOf,
  type ArrowRule,
  type Drawing,
  type FlowLine,
  type Point,
  type Shape,
} from "./drawing.ts";
import { decisionRatio, processToDataWidthRatio, textFits, type SymbolKind } from "./symbols.ts";

export type GostRule =
  | "allowed-symbol"
  | "symbol-size"
  | "column-width"
  | "block-height"
  | "decision-exits"
  | "has-entry"
  | "has-exit"
  | "orthogonal-lines"
  | "arrows"
  | "shapes-overlap"
  | "line-through-shape"
  | "text-fits";

export interface GostViolation {
  readonly rule: GostRule;
  /** Фигура (`id`) или линия (`line N`, с 1). */
  readonly target: string;
  readonly message: string;
}

/** Символы, которые ГОСТ 19.701-90 (раздел 5) разрешает в схеме программы и которые есть в этой версии. */
const allowedSymbols: ReadonlySet<string> = new Set<SymbolKind>([
  "terminator",
  "process",
  "data",
  "decision",
]);

const epsilon = 0.001;
const near = (a: number, b: number) => Math.abs(a - b) < epsilon;

const lineName = (index: number) => `line ${index + 1}`;
const centerX = (shape: Shape) => shape.x + shape.width / 2;

/** Оси старых чертежей можно восстановить по вертикальным соединениям между блоками. */
function connectedAxes(lines: readonly FlowLine[]): Map<string, number> {
  const axes = new Map<string, number>();
  for (const line of lines) {
    const [start, end] = line.points;
    if (line.points.length !== 2 || !start || !end || !near(start.x, end.x)) continue;
    if (line.from !== undefined) axes.set(line.from, start.x);
    if (line.to !== undefined) axes.set(line.to, start.x);
  }
  return axes;
}

function segments(line: FlowLine): [Point, Point][] {
  return line.points.slice(1).map((point, i): [Point, Point] => [line.points[i] ?? point, point]);
}

/** Отрезок проходит через внутренность фигуры (касание края не считается). */
function segmentThroughShape([p, q]: [Point, Point], shape: Shape): boolean {
  const [left, right] = [shape.x + epsilon, shape.x + shape.width - epsilon];
  const [top, bottom] = [shape.y + epsilon, shape.y + shape.height - epsilon];
  const [x1, x2] = [Math.min(p.x, q.x), Math.max(p.x, q.x)];
  const [y1, y2] = [Math.min(p.y, q.y), Math.max(p.y, q.y)];
  return x2 > left && x1 < right && y2 > top && y1 < bottom;
}

function overlap(a: Shape, b: Shape): boolean {
  return (
    a.x + epsilon < b.x + b.width &&
    b.x + epsilon < a.x + a.width &&
    a.y + epsilon < b.y + b.height &&
    b.y + epsilon < a.y + a.height
  );
}

/** Нарушения правил ГОСТ на чертеже; пустой список — чертёж по правилам. */
export function gostCheck(
  drawing: Drawing,
  arrowRule: ArrowRule = arrowOnLeftOrUp,
): GostViolation[] {
  const violations: GostViolation[] = [];
  const add = (rule: GostRule, target: string, message: string) =>
    violations.push({ rule, target, message });
  const firstDecision = drawing.shapes.find((shape) => shape.kind === "decision");
  const columns = new Map<string, Shape[]>();
  const legacyAxes = connectedAxes(drawing.lines);

  for (const shape of drawing.shapes) {
    if (!allowedSymbols.has(shape.kind)) {
      add("allowed-symbol", shape.id, `Символ «${shape.kind}» не разрешён в схеме программы`);
      continue;
    }
    const { rules } = drawing;
    const sizeOk =
      shape.kind === "decision"
        ? near(shape.width, decisionRatio * shape.height) &&
          shape.height >= rules.decisionMinHeight - epsilon &&
          near(shape.width, firstDecision?.width ?? shape.width) &&
          near(shape.height, firstDecision?.height ?? shape.height)
        : shape.width >= rules.minWidth - epsilon &&
          shape.height >= rules.blockMinHeight - epsilon &&
          (shape.kind !== "terminator" || shape.width >= shape.height - epsilon);
    if (!sizeOk) {
      add("symbol-size", shape.id, `Размер ${shape.width}×${shape.height} не по правилам вида`);
    }

    const exits = drawing.lines.filter((line) => line.from === shape.id);
    const entries = drawing.lines.filter((line) => line.to === shape.id);
    if (shape.kind === "decision") {
      const labels = exits.map((line) => line.exit ?? "").sort((a, b) => a.localeCompare(b));
      if (labels.length !== 2 || labels[0] !== "да" || labels[1] !== "нет") {
        add(
          "decision-exits",
          shape.id,
          `У ромба выходы [${labels.join(", ")}], нужны «да» и «нет»`,
        );
      }
    } else {
      const axis =
        shape.axisId === undefined
          ? `x:${(legacyAxes.get(shape.id) ?? centerX(shape)).toFixed(3)}`
          : `axis:${shape.axisId}`;
      const column = columns.get(axis);
      if (column) column.push(shape);
      else columns.set(axis, [shape]);
    }
    if (shape.role !== "start" && entries.length === 0)
      add("has-entry", shape.id, "У фигуры нет входа");
    if (shape.role !== "end" && exits.length === 0)
      add("has-exit", shape.id, "У фигуры нет выхода");

    if (!textFits(shape.kind, shape.width, shape.height, shape.lines, drawing.style, rules)) {
      add("text-fits", shape.id, "Текст не помещается в фигуру");
    }
  }

  // Процессы, данные и терминаторы — одной высоты на всю схему.
  const blocks = drawing.shapes.filter(
    (shape) => shape.kind !== "decision" && allowedSymbols.has(shape.kind),
  );
  const height = blocks[0]?.height;
  for (const shape of blocks) {
    if (height !== undefined && !near(shape.height, height)) {
      add("block-height", shape.id, `Высота ${shape.height} мм, у остальных блоков ${height} мм`);
    }
  }

  for (const column of columns.values()) {
    const data = column.find((shape) => shape.kind === "data");
    const reference = data ?? column[0];
    if (!reference) continue;
    for (const shape of column) {
      const expected =
        data && shape.kind !== "data" ? data.width * processToDataWidthRatio : reference.width;
      if (!near(shape.width, expected) || !near(centerX(shape), centerX(reference))) {
        add("column-width", shape.id, "Края блока не выровнены по фигурам на общей оси");
      }
    }
  }

  drawing.lines.forEach((line, index) => {
    if (segments(line).some(([p, q]) => !near(p.x, q.x) && !near(p.y, q.y))) {
      add("orthogonal-lines", lineName(index), "Линия идёт не по горизонтали и вертикали");
    }
    if (line.arrows.join() !== arrowsOf(line.points, arrowRule).join()) {
      add("arrows", lineName(index), "Стрелки не по правилу");
    }
    for (const shape of drawing.shapes) {
      if (segments(line).some((segment) => segmentThroughShape(segment, shape))) {
        add("line-through-shape", lineName(index), `Линия проходит через фигуру ${shape.id}`);
      }
    }
  });

  drawing.shapes.forEach((a, i) => {
    for (const b of drawing.shapes.slice(i + 1)) {
      if (overlap(a, b)) add("shapes-overlap", a.id, `Фигура пересекается с ${b.id}`);
    }
  });

  return violations;
}
