/** Ширины букв шрифта для расчёта размеров текста без браузера. */
export interface FontMetrics {
  /** Значение `font-family` в SVG. */
  readonly family: string;
  /** Размер em в единицах шрифта. */
  readonly unitsPerEm: number;
  /** Ширина символа, которого нет в таблице. */
  readonly defaultAdvance: number;
  /** Символ → ширина в единицах шрифта. */
  readonly advances: Readonly<Record<string, number>>;
}

/** Ширина строки в мм при кегле `sizeMm`. Кернинг не учитывается. */
export function textWidth(font: FontMetrics, text: string, sizeMm: number): number {
  let units = 0;
  for (const char of text) units += font.advances[char] ?? font.defaultAdvance;
  return (units / font.unitsPerEm) * sizeMm;
}
