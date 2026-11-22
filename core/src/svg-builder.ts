// Строитель SVG с белым списком. Только он собирает разметку: склеивать SVG строками с текстом пользователя нельзя.

const elements = new Set(["svg", "g", "rect", "path", "polygon", "text", "tspan"] as const);

const attributes = new Set([
  "x",
  "y",
  "width",
  "height",
  "d",
  "points",
  "transform",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-miterlimit",
  "font-family",
  "font-size",
  "text-anchor",
  "dominant-baseline",
  "baseline-shift",
  "viewBox",
  "xmlns",
  "data-block-id",
]);

export type SvgElementName = typeof elements extends Set<infer T> ? T : never;
export type SvgAttributes = Readonly<Record<string, string | number>>;

/** Элемент, собранный `el`. Разметка готова и уже экранирована. */
export interface SvgNode {
  readonly markup: string;
}

export type SvgChild = SvgNode | string;

/** Узлы, которые собрал строитель: чужой объект с `markup` не пройдёт. */
const built = new WeakSet<SvgNode>();

/** Символы смены направления текста (U+202A–U+202E, U+2066–U+2069) → видимая метка `⟨U+202E⟩`. */
const directionMarks = new RegExp(String.raw`[\u202A-\u202E\u2066-\u2069]`, "g");

export function showDirectionMarks(text: string): string {
  return text.replace(
    directionMarks,
    (char) => `⟨U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase()}⟩`,
  );
}

const entities: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Символы, запрещённые в XML 1.0 (управляющие, U+FFFE, U+FFFF), и одиночные суррогаты. */
const invalidXml = new RegExp(
  String.raw`[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]`,
  "g",
);

const replacementChar = String.fromCodePoint(0xfffd);

function escape(text: string): string {
  return showDirectionMarks(text)
    .replace(invalidXml, replacementChar)
    .replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

/** Число в мм с точностью 0,01: одинаково в браузере и в Node, без `-0`. */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/** Элемент SVG. Имя и атрибуты — только из белого списка, иначе исключение; текст экранируется. */
export function el(
  name: SvgElementName,
  attrs: SvgAttributes,
  children: readonly SvgChild[] = [],
): SvgNode {
  if (!elements.has(name)) throw new Error(`Элемент SVG не из белого списка: ${String(name)}`);
  let markup = `<${name}`;
  for (const [key, value] of Object.entries(attrs)) {
    if (!attributes.has(key)) throw new Error(`Атрибут SVG не из белого списка: ${key}`);
    markup += ` ${key}="${escape(typeof value === "number" ? formatNumber(value) : value)}"`;
  }
  markup += ">";
  for (const child of children) {
    if (typeof child === "string") {
      markup += escape(child);
    } else {
      if (!built.has(child)) throw new Error("Ребёнок SVG собран не строителем");
      markup += child.markup;
    }
  }
  markup += `</${name}>`;
  const node: SvgNode = Object.freeze({ markup });
  built.add(node);
  return node;
}

export function serialize(node: SvgNode): string {
  if (!built.has(node)) throw new Error("Узел SVG собран не строителем");
  return node.markup;
}
