import type { Text } from "../structure.ts";

/** Текст блока одной строкой для сравнения в тестах: `x^{n + 1}`, `«a»`, перенос — ` | `. */
export function plainText(text: Text): string {
  return text
    .map((part) => {
      switch (part.kind) {
        case "text":
          return part.text;
        case "sup":
          return `^{${part.text}}`;
        case "quoted":
          return `«${part.text}»`;
        case "break":
          return " | ";
      }
    })
    .join("");
}
