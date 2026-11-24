// Чертёж → строка SVG. Только через строитель svg-builder.ts.
import type { Drawing, FlowLine, Point, Shape } from "./drawing.ts";
import { dataSkew } from "./symbols.ts";
import {
  el,
  formatNumber as n,
  serialize,
  type SvgAttributes,
  type SvgChild,
  type SvgNode,
} from "./svg-builder.ts";

const ink = "#000";
const paper = "#fff";
const textInk = "#222";
const labelInk = "#444";
const dash = "2 1";

const pointKey = (point: Point) => `${n(point.x)},${n(point.y)}`;
const points = (list: readonly Point[]) => list.map(pointKey).join(" ");

function outline(shape: Shape): SvgNode {
  const { x, y, width: w, height: h } = shape;
  const dashed: SvgAttributes = shape.dashed ? { "stroke-dasharray": dash } : {};
  switch (shape.kind) {
    case "process":
      return el("rect", { x, y, width: w, height: h, ...dashed });
    case "data": {
      const s = dataSkew(shape.height);
      return el("polygon", {
        points: points([
          { x: x + s, y },
          { x: x + w, y },
          { x: x + w - s, y: y + h },
          { x, y: y + h },
        ]),
        ...dashed,
      });
    }
    case "decision":
      return el("polygon", {
        points: points([
          { x: x + w / 2, y },
          { x: x + w, y: y + h / 2 },
          { x: x + w / 2, y: y + h },
          { x, y: y + h / 2 },
        ]),
        ...dashed,
      });
    case "terminator": {
      // Две горизонтальные прямые и две полуокружности.
      const r = h / 2;
      const d = [
        `M ${n(x + r)} ${n(y)}`,
        `H ${n(x + w - r)}`,
        `A ${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}`,
        `H ${n(x + r)}`,
        `A ${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}`,
        "Z",
      ].join(" ");
      return el("path", { d, ...dashed });
    }
  }
}

function shapeText(shape: Shape, drawing: Drawing): SvgNode[] {
  const { size, lineHeight, supScale } = drawing.style;
  const centerX = shape.x + shape.width / 2;
  const top = shape.y + shape.height / 2 - (shape.lines.length * lineHeight) / 2;
  return shape.lines.map((line, i) => {
    // Базовая линия: середина строки плюс треть кегля — центр заглавных букв.
    const baseline = top + (i + 0.5) * lineHeight + size * 0.35;
    const children: SvgChild[] = line.map((part) =>
      part.kind === "sup"
        ? el("tspan", { "baseline-shift": "super", "font-size": size * supScale }, [part.text])
        : part.text,
    );
    return el("text", { x: centerX, y: baseline, "text-anchor": "middle" }, children);
  });
}

/** Отрезок со стрелкой заканчивается у выреза. На повороте линия продолжает идти от угла. */
function flowLine(
  line: FlowLine,
  strokeWidth: number,
  arrowEndpoints: ReadonlySet<string>,
): SvgNode[] {
  const arrowAt = new Set(line.arrows);
  const tipOffset = 1.118 * strokeWidth;
  const arrowLength = 7 * strokeWidth;
  const arrowHalfWidth = arrowLength / 2;
  const commands: string[] = [];
  const arrows: SvgNode[] = [];
  line.points.forEach((point, index) => {
    const before = line.points[index - 1];
    if (!before) {
      commands.push(`M ${n(point.x)} ${n(point.y)}`);
      return;
    }
    if (!arrowAt.has(index)) {
      commands.push(`L ${n(point.x)} ${n(point.y)}`);
      return;
    }
    const length = Math.hypot(point.x - before.x, point.y - before.y) || 1;
    const [ux, uy] = [(point.x - before.x) / length, (point.y - before.y) / length];
    const tip = { x: point.x - ux * tipOffset, y: point.y - uy * tipOffset };
    const base = { x: tip.x - ux * arrowLength, y: tip.y - uy * arrowLength };
    const notch = {
      x: tip.x - ux * arrowLength * 0.75,
      y: tip.y - uy * arrowLength * 0.75,
    };
    commands.push(`L ${n(notch.x)} ${n(notch.y)}`);
    if (index < line.points.length - 1) commands.push(`M ${n(point.x)} ${n(point.y)}`);
    arrows.push(
      el("polygon", {
        points: points([
          tip,
          { x: base.x - uy * arrowHalfWidth, y: base.y + ux * arrowHalfWidth },
          notch,
          { x: base.x + uy * arrowHalfWidth, y: base.y - ux * arrowHalfWidth },
        ]),
        fill: ink,
        "stroke-miterlimit": 10,
      }),
    );
  });
  const start = line.points[0];
  const startsAtArrow = start !== undefined && arrowEndpoints.has(pointKey(start));
  const lineCap = arrows.length > 0 || startsAtArrow ? "butt" : "square";
  return [el("path", { d: commands.join(" "), "stroke-linecap": lineCap }), ...arrows];
}

/** SVG чертежа: размеры в мм, `viewBox` в мм — печать в масштабе 100 % даёт те же размеры. */
export function renderSvg(drawing: Drawing): string {
  const { style } = drawing;
  const arrowEndpoints = new Set<string>();
  for (const line of drawing.lines) {
    const lastIndex = line.points.length - 1;
    const end = line.points[lastIndex];
    if (end && line.arrows.includes(lastIndex)) arrowEndpoints.add(pointKey(end));
  }
  // Знаков, которых нет в шрифте (≤, ⌊), браузер ищет дальше по списку.
  const family = `${style.font.family}, Times New Roman, serif`;
  const text = (nodes: SvgNode[], color = textInk, size = style.size) =>
    el("g", { fill: color, stroke: "none", "font-family": family, "font-size": size }, nodes);
  return serialize(
    el(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: `${n(drawing.width)}mm`,
        height: `${n(drawing.height)}mm`,
        viewBox: `0 0 ${n(drawing.width)} ${n(drawing.height)}`,
      },
      [
        el(
          "g",
          {
            fill: "none",
            stroke: ink,
            "stroke-width": drawing.strokeWidth,
          },
          drawing.lines.flatMap((line) => flowLine(line, drawing.strokeWidth, arrowEndpoints)),
        ),
        ...drawing.shapes.map((shape) =>
          el("g", { "data-block-id": shape.id }, [
            el("g", { fill: paper, stroke: ink, "stroke-width": 2 * drawing.strokeWidth }, [
              outline(shape),
            ]),
            text(shapeText(shape, drawing)),
          ]),
        ),
        ...(drawing.labels.length > 0
          ? [
              text(
                drawing.labels.map((label) => el("text", { x: label.x, y: label.y }, [label.text])),
                labelInk,
                style.size * drawing.labelScale,
              ),
            ]
          : []),
      ],
    ),
  );
}
