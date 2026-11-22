// Генерирует src/fonts/tinos.ts — ширины букв Tinos 400 (латиница и кириллица).
// Запуск из core/: node scripts/generate-font-metrics.ts
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// opentype.js 2.0 для Node — CommonJS-сборка без типов: берём require, типы — opentype.d.ts.
const opentype = require("opentype.js") as typeof import("opentype.js");
const subsets = ["latin", "cyrillic"];

// Знаков нет ни в одном наборе @fontsource/tinos, браузер рисует их запасным шрифтом.
// Ширины замерены в Chromium (canvas measureText, 22.11.2026), в единицах em = 2048.
// Замер со стеком SVG `Tinos, "Times New Roman", serif`: ≤ ≥ ≠ — как у Times New Roman.
const fallback: Record<string, number> = {
  "≠": 1124,
  "≤": 1124,
  "≥": 1124,
  "⌊": 717,
  "⌋": 717,
  "⟨": 736,
  "⟩": 736,
};

const advances = new Map<number, number>();
let unitsPerEm = 0;

for (const subset of subsets) {
  const path = require.resolve(`@fontsource/tinos/files/tinos-${subset}-400-normal.woff`);
  const file = await readFile(path);
  const font = opentype.parse(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
  unitsPerEm = font.unitsPerEm;
  for (const [code, glyphIndex] of Object.entries(font.tables.cmap.glyphIndexMap)) {
    const advance = font.glyphs.get(glyphIndex).advanceWidth;
    if (advance !== undefined && advance > 0) advances.set(Number(code), advance);
  }
}

for (const [char, advance] of Object.entries(fallback)) {
  const code = char.codePointAt(0);
  if (code !== undefined && !advances.has(code)) advances.set(code, advance);
}

// Символы управления (кроме пробела) не рисуются — в таблицу не берём.
const entries = [...advances]
  .filter(([code]) => code >= 0x20 && !(code >= 0x7f && code < 0xa0))
  .sort(([a], [b]) => a - b)
  .map(([code, advance]) => `    ${JSON.stringify(String.fromCodePoint(code))}: ${advance},`);

// Ширина по умолчанию — ширина цифры: средняя буква Tinos.
const defaultAdvance = advances.get("0".codePointAt(0) ?? 0) ?? unitsPerEm / 2;

const source = `// Сгенерировано scripts/generate-font-metrics.ts из @fontsource/tinos (400, latin + cyrillic). Не править руками.
import type { FontMetrics } from "./font-metrics.ts";

export const tinos: FontMetrics = {
  family: "Tinos",
  unitsPerEm: ${unitsPerEm},
  defaultAdvance: ${defaultAdvance},
  advances: {
${entries.join("\n")}
  },
};
`;

await writeFile(new URL("../src/fonts/tinos.ts", import.meta.url), source);
console.log(`src/fonts/tinos.ts: ${entries.length} символов`);
