/**
 * Узел дерева разбора — то, что ядро берёт у парсера. Узел `web-tree-sitter`
 * подходит по структуре, но ядро от tree-sitter не зависит: дерево даёт вызывающий.
 */
export interface SyntaxNode {
  readonly type: string;
  readonly text: string;
  readonly children: readonly SyntaxNode[];
  readonly namedChildren: readonly SyntaxNode[];
  childForFieldName(fieldName: string): SyntaxNode | null;
  /** Строка и столбец, с 0. */
  readonly startPosition: { readonly row: number; readonly column: number };
  /** Узел вставлен парсером на месте пропущенного символа. */
  readonly isMissing: boolean;
  /** В поддереве есть ошибка разбора. */
  readonly hasError: boolean;
}
