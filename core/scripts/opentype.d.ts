// opentype.js 2.0 не публикует типы. Здесь только то, что берёт generate-font-metrics.ts.
declare module "opentype.js" {
  interface Glyph {
    advanceWidth?: number;
  }
  interface Font {
    unitsPerEm: number;
    tables: { cmap: { glyphIndexMap: Record<string, number> } };
    glyphs: { get(index: number): Glyph };
  }
  export function parse(buffer: ArrayBuffer): Font;
}
