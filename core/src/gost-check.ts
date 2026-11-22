// Проверка чертежа по правилам ГОСТ 19.701-90 и вида схемы (design, решения 14 и 19). Позже — функция продукта.
import {
  arrowOnLeftOrUp,
  arrowsOf,
  type ArrowRule,
  type Drawing,
  type FlowLine,
  type Point,
  type Shape,
} from "./drawing.ts";
import { textFits, type SymbolKind } from "./symbols.ts";

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

  for (const shape of drawing.shapes) {
    if (!allowedSymbols.has(shape.kind)) {
      add("allowed-symbol", shape.id, `Символ «${shape.kind}» не разрешён в схеме программы`);
      continue;
    }
    const { rules } = drawing;
    const sizeOk =
      shape.kind === "decision"
        ? near(shape.width, 2 * shape.height) && shape.height >= rules.decisionMinHeight - epsilon
        : shape.width >= rules.minWidth - epsilon;
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
    }
    if (shape.role !== "start" && entries.length === 0)
      add("has-entry", shape.id, "У фигуры нет входа");
    if (shape.role !== "end" && exits.length === 0)
      add("has-exit", shape.id, "У фигуры нет выхода");

    if (!textFits(shape.kind, shape.width, shape.height, shape.lines, drawing.style, rules)) {
      add("text-fits", shape.id, "Текст не помещается в фигуру");
    }
  }

  // Процессы и данные — одной высоты на всю схему.
  const blocks = drawing.shapes.filter(
    (shape) => shape.kind === "process" || shape.kind === "data",
  );
  const height = blocks[0]?.height;
  for (const shape of blocks) {
    if (height !== undefined && !near(shape.height, height)) {
      add("block-height", shape.id, `Высота ${shape.height} мм, у остальных блоков ${height} мм`);
    }
  }

  // Соседние блоки одной оси (прямая вертикальная линия между ними) — одной ширины.
  const byId = new Map(drawing.shapes.map((shape) => [shape.id, shape]));
  for (const line of drawing.lines) {
    const [from, to] = [byId.get(line.from ?? ""), byId.get(line.to ?? "")];
    const straight =
      line.points.length === 2 && near(line.points[0]?.x ?? 0, line.points[1]?.x ?? 1);
    if (from && to && straight && from.kind !== "decision" && to.kind !== "decision") {
      if (!near(from.width, to.width)) {
        add("column-width", to.id, `Ширина ${to.width} мм, у блока выше ${from.width} мм`);
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
