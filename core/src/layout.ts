// Структура → чертёж: своя раскладка вложенными коробками (design, решения 3 и 19).
import {
  arrowOnLeftOrUp,
  arrowsOf,
  type ArrowRule,
  type Drawing,
  type ExitLabel,
  type FlowLine,
  type Label,
  type Point,
  type Shape,
} from "./drawing.ts";
import { textWidth } from "./fonts/font-metrics.ts";
import { tinos } from "./fonts/tinos.ts";
import { joinText } from "./notation.ts";
import type { Program, Step, Text } from "./structure.ts";
import {
  blockHeight,
  blockWidth,
  decisionSize,
  symbolLines,
  symbolRules,
  terminatorHeight,
  type SymbolKind,
  type SymbolRules,
  type TextLine,
  type TextStyle,
} from "./symbols.ts";

export interface LayoutOptions {
  readonly style: TextStyle;
  readonly rules: SymbolRules;
  /** Вертикальный промежуток между фигурами, мм. */
  readonly gap: number;
  /** Отрезок от ромба вниз до следующей фигуры: на нём подпись «да», мм. */
  readonly exitGap: number;
  /** Боковая линия (ветка «нет», возврат, выход цикла) от края фигуры, мм. */
  readonly side: number;
  /** Шаг между соседними боковыми линиями, мм. */
  readonly step: number;
  /** Поле вокруг схемы, мм. */
  readonly margin: number;
  /** Толщина линий, мм. */
  readonly strokeWidth: number;
  /** Кегль подписей «да»/«нет» относительно основного. */
  readonly labelScale: number;
  readonly arrowRule: ArrowRule;
}

/** Кегль по умолчанию, мм: ряд шрифтов ЕСКД. Все размеры ниже — от него. */
const k = 3.5;

/** Значения по умолчанию — design, решение 19 (по замеру схем человека; промежутки — по его схемам из draw.io). */
export const defaultLayoutOptions: LayoutOptions = {
  style: { font: tinos, size: k, lineHeight: 1.25 * k, supScale: 0.7 },
  rules: symbolRules(k),
  gap: 1.2 * k,
  exitGap: 2 * k,
  side: 3 * k,
  step: 1.5 * k,
  margin: 1.5 * k,
  strokeWidth: k / 12,
  labelScale: 0.85,
  arrowRule: arrowOnLeftOrUp,
};

/** Линия без стрелок: стрелки ставит правило в конце раскладки. */
type DraftLine = Omit<FlowLine, "arrows">;

/**
 * Коробка конструкции. Координаты относительно оси входа (x = 0) и верха (y = 0);
 * выход — на той же оси внизу (y = height).
 */
interface Box {
  readonly shapes: Shape[];
  readonly lines: DraftLine[];
  readonly labels: Label[];
  /** Края всего содержимого. */
  minX: number;
  maxX: number;
  /** Края фигур: от них боковые линии отходят на `side`, от линий — на `step`. */
  shapeMinX: number;
  shapeMaxX: number;
  height: number;
  /** Фигура, верх которой — вход коробки. */
  entry?: string;
  /** Фигура, низ которой — выход коробки. */
  exit?: string;
}

const emptyBox = (): Box => ({
  shapes: [],
  lines: [],
  labels: [],
  minX: 0,
  maxX: 0,
  shapeMinX: 0,
  shapeMaxX: 0,
  height: 0,
});

const shift = (point: Point, dx: number, dy: number): Point => ({
  x: point.x + dx,
  y: point.y + dy,
});

/** Копирует содержимое `child` в `target` со сдвигом. */
function place(target: Box, child: Box, dx: number, dy: number): void {
  for (const s of child.shapes) target.shapes.push({ ...s, x: s.x + dx, y: s.y + dy });
  for (const line of child.lines) {
    target.lines.push({ ...line, points: line.points.map((p) => shift(p, dx, dy)) });
  }
  for (const label of child.labels)
    target.labels.push({ ...label, x: label.x + dx, y: label.y + dy });
  target.minX = Math.min(target.minX, child.minX + dx);
  target.maxX = Math.max(target.maxX, child.maxX + dx);
  if (child.shapes.length > 0) {
    target.shapeMinX = Math.min(target.shapeMinX, child.shapeMinX + dx);
    target.shapeMaxX = Math.max(target.shapeMaxX, child.shapeMaxX + dx);
  }
}

const line = (points: Point[], from?: string, to?: string, exit?: ExitLabel): DraftLine => ({
  points,
  ...(from === undefined ? {} : { from }),
  ...(to === undefined ? {} : { to }),
  ...(exit === undefined ? {} : { exit }),
});

const unsupportedMark = "пока не поддерживается";

/** Простой шаг: один блок процесса или данных, без вложенных шагов. */
type SimpleStep = Extract<Step, { kind: "process" | "input" | "output" | "unsupported" }>;

const isSimple = (step: Step): step is SimpleStep =>
  step.kind === "process" ||
  step.kind === "input" ||
  step.kind === "output" ||
  step.kind === "unsupported";

const simpleKind = (step: SimpleStep): "process" | "data" =>
  step.kind === "input" || step.kind === "output" ? "data" : "process";

const simpleText = (step: SimpleStep): Text =>
  step.kind === "unsupported"
    ? joinText(step.firstLine, [{ kind: "break" }], unsupportedMark)
    : step.text;

function* simpleSteps(steps: readonly Step[]): Generator<SimpleStep> {
  for (const step of steps) {
    if (isSimple(step)) yield step;
    else if (step.kind === "if") {
      yield* simpleSteps(step.then);
      yield* simpleSteps(step.else);
    } else yield* simpleSteps(step.body);
  }
}

/** Блок, ещё не поставленный: размеры известны, ширина колонки — нет. */
interface PendingBlock {
  readonly kind: Exclude<SymbolKind, "decision">;
  readonly lines: readonly TextLine[];
  readonly height: number;
  readonly width: number;
  readonly extra: Pick<Shape, "dashed"> & Partial<Pick<Shape, "role" | "sourceLine">>;
}

class Layout {
  #nextId = 1;
  readonly options: LayoutOptions;
  /** Высота всех процессов и данных схемы — по самому высокому. */
  readonly blockHeight: number;

  constructor(options: LayoutOptions, program: Program) {
    this.options = options;
    const { style, rules } = options;
    this.blockHeight = Math.max(
      rules.blockMinHeight,
      ...[...simpleSteps(program.body)].map((step) =>
        blockHeight(symbolLines(simpleKind(step), simpleText(step), style, rules), style, rules),
      ),
    );
  }

  pending(step: SimpleStep): PendingBlock {
    const { style, rules } = this.options;
    const kind = simpleKind(step);
    const lines = symbolLines(kind, simpleText(step), style, rules);
    return {
      kind,
      lines,
      height: this.blockHeight,
      width: blockWidth(kind, lines, this.blockHeight, style, rules),
      extra: { dashed: step.kind === "unsupported", sourceLine: step.line },
    };
  }

  terminator(text: string, role: "start" | "end"): PendingBlock {
    const { style, rules } = this.options;
    const lines = symbolLines("terminator", joinText(text), style, rules);
    const height = terminatorHeight(lines, style, rules);
    return {
      kind: "terminator",
      lines,
      height,
      width: blockWidth("terminator", lines, height, style, rules),
      extra: { dashed: false, role },
    };
  }

  shapeBox(
    kind: SymbolKind,
    width: number,
    height: number,
    lines: readonly TextLine[],
    extra: PendingBlock["extra"],
  ): Box {
    const id = `b${this.#nextId++}`;
    const shape: Shape = {
      id,
      kind,
      x: -width / 2,
      y: 0,
      width,
      height,
      lines,
      dashed: extra.dashed,
      ...(extra.role ? { role: extra.role } : {}),
      ...(extra.sourceLine === undefined ? {} : { sourceLine: extra.sourceLine }),
    };
    return {
      shapes: [shape],
      lines: [],
      labels: [],
      minX: shape.x,
      maxX: -shape.x,
      shapeMinX: shape.x,
      shapeMaxX: -shape.x,
      height,
      entry: id,
      exit: id,
    };
  }

  labelWidth(text: ExitLabel): number {
    const { style } = this.options;
    return textWidth(style.font, text, style.size * this.options.labelScale);
  }

  /** Подпись у нижнего выхода — справа от линии на середине отрезка `top`…`bottom`. */
  downLabel(top: number, bottom: number): Label {
    const size = this.options.style.size * this.options.labelScale;
    return { x: 0.35 * size, y: (top + bottom) / 2 + 0.35 * size, text: "да" };
  }

  /** Подпись у правого выхода — над линией сразу за углом ромба. */
  rightLabel(cornerX: number, lineY: number): Label {
    const size = this.options.style.size * this.options.labelScale;
    return { x: cornerX + 0.35 * size, y: lineY - 0.4 * size, text: "нет" };
  }

  sequence(boxes: readonly Box[]): Box {
    const result = emptyBox();
    let y = 0;
    boxes.forEach((box, i) => {
      const previous = boxes[i - 1];
      if (previous) {
        result.lines.push(
          line(
            [
              { x: 0, y },
              { x: 0, y: y + this.options.gap },
            ],
            previous.exit,
            box.entry,
          ),
        );
        y += this.options.gap;
      }
      place(result, box, 0, y);
      y += box.height;
    });
    result.height = y;
    const [first, end] = [boxes[0], boxes.at(-1)];
    if (first?.entry) result.entry = first.entry;
    if (end?.exit) result.exit = end.exit;
    return result;
  }

  /**
   * Шаги одной оси. Простые блоки получают общую ширину — по самому широкому (решение 19);
   * `before` и `after` — блоки той же оси вне шагов (терминаторы программы).
   */
  column(steps: readonly Step[], before: PendingBlock[] = [], after: PendingBlock[] = []): Box {
    const items = steps.map((step) => (isSimple(step) ? this.pending(step) : step));
    const blocks = [
      ...before,
      ...after,
      ...items.filter((item): item is PendingBlock => "lines" in item),
    ];
    const width = Math.max(0, ...blocks.map((block) => block.width));
    const build = (block: PendingBlock) =>
      this.shapeBox(block.kind, width, block.height, block.lines, block.extra);
    return this.sequence([
      ...before.map(build),
      ...items.map((item) => ("lines" in item ? build(item) : this.compound(item))),
      ...after.map(build),
    ]);
  }

  compound(step: Extract<Step, { kind: "if" | "while" }>): Box {
    return step.kind === "if"
      ? this.ifBox(step.condition, step.line, this.column(step.then), this.column(step.else))
      : this.whileBox(step.condition, step.line, this.column(step.body));
  }

  decision(condition: Text, sourceLine: number): Box {
    const { style, rules } = this.options;
    const lines = symbolLines("decision", condition, style, rules);
    const size = decisionSize(lines, style, rules);
    return this.shapeBox("decision", size.width, size.height, lines, { dashed: false, sourceLine });
  }

  ifBox(condition: Text, sourceLine: number, yes: Box, no: Box): Box {
    const { gap, side, step } = this.options;
    const result = this.decision(condition, sourceLine);
    const decision = result.shapes[0];
    if (!decision) throw new Error("нет ромба");
    const half = decision.width / 2;
    const middle = decision.height / 2;
    const branchTop = decision.height + this.options.exitGap;
    const hasYes = yes.height > 0;
    const hasNo = no.height > 0;
    result.exit = undefined;

    // Ветка «да».
    let yesBottom = decision.height;
    if (hasYes) {
      result.lines.push(
        line(
          [
            { x: 0, y: decision.height },
            { x: 0, y: branchTop },
          ],
          decision.id,
          yes.entry,
          "да",
        ),
      );
      place(result, yes, 0, branchTop);
      yesBottom = branchTop + yes.height;
    }

    // Ось ветки «нет»: фигуры — на `side` правее фигур ветки «да», линии — на `step` правее линий.
    const noLabel = this.rightLabel(half, middle);
    const noAxis = Math.max(
      half + side,
      noLabel.x + this.labelWidth("нет") + step,
      (hasYes ? yes.shapeMaxX : 0) + side - (hasNo ? no.shapeMinX : 0),
      (hasYes ? yes.maxX : 0) + step - (hasNo ? no.minX : 0),
    );
    let noBottom = middle;
    if (hasNo) {
      result.lines.push(
        line(
          [
            { x: half, y: middle },
            { x: noAxis, y: middle },
            { x: noAxis, y: branchTop },
          ],
          decision.id,
          no.entry,
          "нет",
        ),
      );
      place(result, no, noAxis, branchTop);
      noBottom = branchTop + no.height;
    }

    const merge = Math.max(yesBottom, noBottom) + gap;
    result.labels.push(this.downLabel(decision.height, hasYes ? branchTop : merge), noLabel);
    result.lines.push(
      hasYes
        ? line(
            [
              { x: 0, y: yesBottom },
              { x: 0, y: merge },
            ],
            yes.exit,
          )
        : line(
            [
              { x: 0, y: decision.height },
              { x: 0, y: merge },
            ],
            decision.id,
            undefined,
            "да",
          ),
    );
    result.lines.push(
      hasNo
        ? line(
            [
              { x: noAxis, y: noBottom },
              { x: noAxis, y: merge },
              { x: 0, y: merge },
            ],
            no.exit,
          )
        : line(
            [
              { x: half, y: middle },
              { x: noAxis, y: middle },
              { x: noAxis, y: merge },
              { x: 0, y: merge },
            ],
            decision.id,
            undefined,
            "нет",
          ),
    );
    result.maxX = Math.max(result.maxX, noAxis, noLabel.x + this.labelWidth("нет"));
    result.height = merge;
    return result;
  }

  whileBox(condition: Text, sourceLine: number, body: Box): Box {
    const { gap, side, step } = this.options;
    const symbol = this.decision(condition, sourceLine);
    const decision = symbol.shapes[0];
    if (!decision) throw new Error("нет ромба");
    const half = decision.width / 2;
    const top = gap;
    const middle = top + decision.height / 2;
    const bottomOfDecision = top + decision.height;
    const hasBody = body.height > 0;

    const result = emptyBox();
    // Над ромбом — отрезок линии: в него входит возврат.
    result.lines.push(
      line(
        [
          { x: 0, y: 0 },
          { x: 0, y: top },
        ],
        undefined,
        decision.id,
      ),
    );
    place(result, symbol, 0, top);

    let bodyBottom = bottomOfDecision;
    if (hasBody) {
      const bodyTop = bottomOfDecision + this.options.exitGap;
      result.lines.push(
        line(
          [
            { x: 0, y: bottomOfDecision },
            { x: 0, y: bodyTop },
          ],
          decision.id,
          body.entry,
          "да",
        ),
      );
      place(result, body, 0, bodyTop);
      bodyBottom = bodyTop + body.height;
    }

    // Возврат: вниз, влево (на `side` от фигур и на `step` от линий), вверх, вправо в линию над ромбом.
    const backY = bodyBottom + gap;
    const backX = Math.min(
      Math.min(hasBody ? body.shapeMinX : 0, -half) - side,
      (hasBody ? body.minX : 0) - step,
    );
    result.lines.push(
      line(
        [
          { x: 0, y: bodyBottom },
          { x: 0, y: backY },
          { x: backX, y: backY },
          { x: backX, y: 0 },
          { x: 0, y: 0 },
        ],
        hasBody ? body.exit : decision.id,
        undefined,
        hasBody ? undefined : "да",
      ),
    );

    // Выход «нет»: вправо правее тела, вниз ниже возврата, влево в линию под циклом.
    const noLabel = this.rightLabel(half, middle);
    const exitY = backY + gap;
    const noX = Math.max(
      Math.max(hasBody ? body.shapeMaxX : 0, half) + side,
      noLabel.x + this.labelWidth("нет") + step,
      (hasBody ? body.maxX : 0) + step,
    );
    result.lines.push(
      line(
        [
          { x: half, y: middle },
          { x: noX, y: middle },
          { x: noX, y: exitY },
          { x: 0, y: exitY },
        ],
        decision.id,
        undefined,
        "нет",
      ),
    );
    result.labels.push(
      this.downLabel(bottomOfDecision, hasBody ? bottomOfDecision + this.options.exitGap : backY),
      noLabel,
    );

    result.minX = Math.min(result.minX, backX);
    result.maxX = Math.max(result.maxX, noX);
    result.height = exitY;
    return result;
  }

  program(program: Program): Drawing {
    const { margin, arrowRule, style, rules, strokeWidth, labelScale } = this.options;
    const box = this.column(
      program.body,
      [this.terminator("Начало", "start")],
      [this.terminator("Конец", "end")],
    );
    const dx = margin - box.minX;
    const dy = margin;
    const moved = emptyBox();
    place(moved, box, dx, dy);
    return {
      width: box.maxX - box.minX + 2 * margin,
      height: box.height + 2 * margin,
      shapes: moved.shapes,
      lines: moved.lines.map((draft) => ({ ...draft, arrows: arrowsOf(draft.points, arrowRule) })),
      labels: moved.labels,
      style,
      rules,
      strokeWidth,
      labelScale,
    };
  }
}

/** Чертёж программы. Одинаковая структура даёт одинаковый чертёж. */
export function layout(program: Program, options: Partial<LayoutOptions> = {}): Drawing {
  return new Layout({ ...defaultLayoutOptions, ...options }, program).program(program);
}
