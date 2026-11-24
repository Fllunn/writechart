// Размеры символов от текста (design, решения 19 и 20) и перенос строк.
import { textWidth, type FontMetrics } from "./fonts/font-metrics.ts";
import type { Text } from "./structure.ts";
import { showDirectionMarks } from "./svg-builder.ts";

export type SymbolKind = "terminator" | "process" | "data" | "decision";

export interface TextStyle {
  readonly font: FontMetrics;
  /** Кегль, мм. */
  readonly size: number;
  /** Высота строки, мм. */
  readonly lineHeight: number;
  /** Кегль надстрочного текста относительно обычного. */
  readonly supScale: number;
}

/** Правила размеров символов, мм. Все задаются от кегля (`symbolRules`). */
export interface SymbolRules {
  /** Наименьшая ширина процесса, данных и терминатора. */
  readonly minWidth: number;
  /** Строка длиннее — переносится. */
  readonly maxLineWidth: number;
  /** То же внутри ромба. */
  readonly decisionMaxLineWidth: number;
  /** Наименьшая высота процесса, данных и терминатора. */
  readonly blockMinHeight: number;
  /** Наименьшая высота ромба. */
  readonly decisionMinHeight: number;
  /** Поле между текстом и краем внутренней области по горизонтали и по вертикали. */
  readonly paddingX: number;
  readonly paddingY: number;
}

/** Правила по замеру схем человека (design, решения 19 и 20), кегль `k` мм. */
export function symbolRules(k: number): SymbolRules {
  return {
    minWidth: 10.3 * k,
    maxLineWidth: 20 * k,
    decisionMaxLineWidth: 10 * k,
    blockMinHeight: (40 / 12) * k,
    decisionMinHeight: 5 * k,
    paddingX: 1.15 * k,
    paddingY: 0.45 * k,
  };
}

/** Кусок строки после переноса: «ёлочки» уже вставлены. */
export interface LinePart {
  readonly kind: "text" | "sup";
  readonly text: string;
}

export type TextLine = readonly LinePart[];

const dataSkewRatio = 0.23;

/** Ширина прямоугольника между серединами наклонных сторон параллелограмма. */
export const processToDataWidthRatio = 1 - dataSkewRatio;

/** Скос параллелограмма «Данные» по горизонтали. */
export const dataSkew = (width: number) => dataSkewRatio * width;

/** Внутренняя область символа, куда помещается текст (без полей). */
export function innerArea(
  kind: SymbolKind,
  width: number,
  height: number,
): { width: number; height: number } {
  switch (kind) {
    case "process":
      return { width, height };
    case "data":
      return { width: width - 2 * dataSkew(width), height };
    case "decision":
      return { width: width / 2, height: height / 2 };
    case "terminator":
      return { width: width - height / 2, height };
  }
}

const partWidth = (part: LinePart, style: TextStyle) =>
  textWidth(style.font, part.text, part.kind === "sup" ? style.size * style.supScale : style.size);

export function lineWidth(line: TextLine, style: TextStyle): number {
  return line.reduce((sum, part) => sum + partWidth(part, style), 0);
}

/** Боковое поле ромба (design, решение 22), мм. */
const decisionPaddingX = (fontSize: number) => 0.35 * fontSize;

/** Текст помещается во внутреннюю область с полями. */
export function textFits(
  kind: SymbolKind,
  width: number,
  height: number,
  lines: readonly TextLine[],
  style: TextStyle,
  rules: SymbolRules,
): boolean {
  const inner = innerArea(kind, width, height);
  const epsilon = 0.001;
  const paddingX = kind === "decision" ? decisionPaddingX(style.size) : rules.paddingX;
  return (
    lines.length * style.lineHeight + 2 * rules.paddingY <= inner.height + epsilon &&
    lines.every((line) => lineWidth(line, style) + 2 * paddingX <= inner.width + epsilon)
  );
}

function append(parts: LinePart[], part: LinePart): void {
  if (part.text === "") return;
  const last = parts.at(-1);
  if (last && last.kind === part.kind)
    parts[parts.length - 1] = { kind: part.kind, text: last.text + part.text };
  else parts.push(part);
}

interface Word {
  readonly parts: LinePart[];
  /** Слово начинает новую строку (после принудительного переноса). */
  readonly newLine: boolean;
}

/** Слова текста: пробелы обычного текста — места переноса; надстрочный текст держится за слово. */
function words(text: Text): Word[] {
  const result: Word[] = [];
  let current: LinePart[] = [];
  let newLine = false;
  const finish = () => {
    if (current.length > 0) result.push({ parts: current, newLine });
    current = [];
    newLine = false;
  };
  for (const part of text) {
    if (part.kind === "break") {
      finish();
      newLine = true;
    } else if (part.kind === "sup") {
      append(current, { kind: "sup", text: showDirectionMarks(part.text) });
    } else {
      const raw = part.kind === "quoted" ? `«${part.text}»` : part.text;
      showDirectionMarks(raw)
        .split(" ")
        .forEach((chunk, i) => {
          if (i > 0) finish();
          append(current, { kind: "text", text: chunk });
        });
    }
  }
  finish();
  return result;
}

/** Слово, которое шире строки, режется по буквам. */
function splitWord(word: LinePart[], maxWidth: number, style: TextStyle): LinePart[][] {
  const pieces: LinePart[][] = [];
  let current: LinePart[] = [];
  for (const part of word) {
    for (const char of part.text) {
      const next = [...current];
      append(next, { kind: part.kind, text: char });
      if (current.length > 0 && lineWidth(next, style) > maxWidth) {
        pieces.push(current);
        current = [];
        append(current, { kind: part.kind, text: char });
      } else {
        current = next;
      }
    }
  }
  if (current.length > 0) pieces.push(current);
  return pieces;
}

/** Жадный перенос по словам в строки шириной до `maxWidth`; слово шире строки режется по буквам. */
export function wrapText(text: Text, maxWidth: number, style: TextStyle): TextLine[] {
  const lines: LinePart[][] = [];
  let line: LinePart[] | undefined;
  for (const word of words(text)) {
    const pieces =
      lineWidth(word.parts, style) > maxWidth
        ? splitWord(word.parts, maxWidth, style)
        : [word.parts];
    pieces.forEach((piece, i) => {
      const startNew = !line || (i === 0 && word.newLine) || i > 0;
      if (!startNew && line) {
        const candidate = [...line];
        append(candidate, { kind: "text", text: " " });
        for (const part of piece) append(candidate, part);
        if (lineWidth(candidate, style) <= maxWidth) {
          line = candidate;
          lines[lines.length - 1] = line;
          return;
        }
      }
      line = [...piece];
      lines.push(line);
    });
  }
  return lines.length > 0 ? lines : [[]];
}

/**
 * Перенос строк примерно равной длины: столько же строк, сколько даёт жадный перенос
 * по `maxWidth`, но при наименьшей ширине — без «одного слова в последней строке».
 */
export function wrapBalanced(text: Text, maxWidth: number, style: TextStyle): TextLine[] {
  const greedy = wrapText(text, maxWidth, style);
  if (greedy.length <= 1) return greedy;
  let low = 0;
  let high = maxWidth;
  for (let i = 0; i < 24; i += 1) {
    const middle = (low + high) / 2;
    if (wrapText(text, middle, style).length <= greedy.length) high = middle;
    else low = middle;
  }
  return wrapText(text, high, style);
}

const textBlockWidth = (lines: readonly TextLine[], style: TextStyle) =>
  Math.max(0, ...lines.map((line) => lineWidth(line, style)));

/** Строки текста символа: в ромбе предел строки свой. */
export function symbolLines(
  kind: SymbolKind,
  text: Text,
  style: TextStyle,
  rules: SymbolRules,
): TextLine[] {
  return wrapBalanced(
    text,
    kind === "decision" ? rules.decisionMaxLineWidth : rules.maxLineWidth,
    style,
  );
}

/** Высота процесса, данных или терминатора, нужная строкам. */
export function blockHeight(
  lines: readonly TextLine[],
  style: TextStyle,
  rules: SymbolRules,
): number {
  return Math.max(rules.blockMinHeight, lines.length * style.lineHeight + 2 * rules.paddingY);
}

/** Ширина процесса, данных или терминатора заданной высоты, нужная строкам (не меньше минимума). */
export function blockWidth(
  kind: Exclude<SymbolKind, "decision">,
  lines: readonly TextLine[],
  height: number,
  style: TextStyle,
  rules: SymbolRules,
): number {
  const text = textBlockWidth(lines, style) + 2 * rules.paddingX;
  if (kind === "data") {
    return Math.max(rules.minWidth, text / (1 - 2 * dataSkewRatio));
  }
  if (kind === "terminator") {
    return Math.max(rules.minWidth, height, text + height / 2);
  }
  return Math.max(rules.minWidth, text);
}

export const decisionRatio = 1.86;

/** Текст ромба — во вписанном прямоугольнике, занимающем половину ширины и высоты. */
export function decisionSize(
  lines: readonly TextLine[],
  style: TextStyle,
  rules: SymbolRules,
): { width: number; height: number } {
  const textW = textBlockWidth(lines, style) + 2 * decisionPaddingX(style.size);
  const textH = lines.length * style.lineHeight + 2 * rules.paddingY;
  const height = Math.max(rules.decisionMinHeight, (2 * textW) / decisionRatio, 2 * textH);
  return { width: decisionRatio * height, height };
}
