// Чертёж: фигуры и линии с координатами в мм. Его рисует render-svg и проверяет gost-check.
import type { SymbolKind, SymbolRules, TextLine, TextStyle } from "./symbols.ts";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Shape {
  readonly id: string;
  readonly kind: SymbolKind;
  /** Вертикальная ось, по которой согласованы ширины прямоугольников, данных и терминаторов. */
  readonly axisId?: number;
  /** Левый верхний угол описанного прямоугольника, мм. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly lines: readonly TextLine[];
  /** Пунктирный контур — неподдерживаемая конструкция. */
  readonly dashed: boolean;
  /** Терминатор «Начало» или «Конец». */
  readonly role?: "start" | "end";
  /** Строка кода, с 1. */
  readonly sourceLine?: number;
}

export type ExitLabel = "да" | "нет";

export interface FlowLine {
  readonly points: readonly Point[];
  /** Номера точек (с 1), где стоит остриё стрелки: конец отрезка `points[i - 1]` → `points[i]`. */
  readonly arrows: readonly number[];
  /** Фигура, из которой линия выходит. */
  readonly from?: string;
  /** Фигура, в которую линия входит; нет — линия входит в другую линию. */
  readonly to?: string;
  /** Выход ромба. */
  readonly exit?: ExitLabel;
}

/** Подпись выхода ромба; `x`, `y` — левый край и базовая линия текста. */
export interface Label {
  readonly x: number;
  readonly y: number;
  readonly text: ExitLabel;
}

export interface Drawing {
  readonly width: number;
  readonly height: number;
  readonly shapes: readonly Shape[];
  readonly lines: readonly FlowLine[];
  readonly labels: readonly Label[];
  readonly style: TextStyle;
  /** Правила размеров, по которым построен чертёж: их проверяет gost-check. */
  readonly rules: SymbolRules;
  /** Толщина линий, мм. */
  readonly strokeWidth: number;
  /** Кегль подписей «да»/«нет» относительно основного. */
  readonly labelScale: number;
}

/** Правило стрелок: ставить ли стрелку в конце отрезка `from` → `to`. */
export type ArrowRule = (from: Point, to: Point) => boolean;

/** По умолчанию: стрелка на каждом отрезке влево или вверх (спека «Линии и стрелки»). */
export const arrowOnLeftOrUp: ArrowRule = (from, to) => to.x < from.x || to.y < from.y;

/** Где по правилу стоят стрелки линии: номера точек-концов отрезков. */
export function arrowsOf(points: readonly Point[], rule: ArrowRule): number[] {
  return points.flatMap((point, i) => {
    const previous = points[i - 1];
    return previous !== undefined && rule(previous, point) ? [i] : [];
  });
}
