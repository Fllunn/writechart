// Одна функция для фронта: дерево разбора → SVG схемы, предупреждения, ошибки.
import { convertPython } from "./languages/python.ts";
import type { SyntaxNode } from "./languages/syntax-node.ts";
import { layout, type LayoutOptions } from "./layout.ts";
import { renderSvg } from "./render-svg.ts";
import type { Diagnostic } from "./structure.ts";

export type { Diagnostic } from "./structure.ts";
export type { SyntaxNode } from "./languages/syntax-node.ts";
export { checkCodeLength, limits } from "./limits.ts";

export interface FlowchartOptions {
  /** Язык дерева разбора. В этой версии только Python. */
  readonly language?: "python";
  readonly layout?: Partial<LayoutOptions>;
}

export interface FlowchartResult {
  /** SVG схемы; `null`, если есть ошибки. */
  readonly svg: string | null;
  readonly warnings: readonly Diagnostic[];
  readonly errors: readonly Diagnostic[];
}

/** Схема по корню дерева разбора. Ошибка в коде или лимит — ошибки и нет SVG. */
export function flowchart(root: SyntaxNode, options: FlowchartOptions = {}): FlowchartResult {
  const structure = convertPython(root);
  if (!structure.ok) return { svg: null, warnings: [], errors: structure.errors };
  return {
    svg: renderSvg(layout(structure.program, options.layout)),
    warnings: structure.warnings,
    errors: [],
  };
}
