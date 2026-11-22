// Дерево разбора Python (tree-sitter-python) → структура программы.
import { checkCodeLength, limitMessages, limits } from "../limits.ts";
import {
  assignment,
  augmentedAssignment,
  expression,
  joinText,
  joinWith,
  printArguments,
} from "../notation.ts";
import type { Diagnostic, Program, Step, Text } from "../structure.ts";
import type { SyntaxNode } from "./syntax-node.ts";

export type PythonResult =
  | { readonly ok: true; readonly program: Program; readonly warnings: readonly Diagnostic[] }
  | { readonly ok: false; readonly errors: readonly Diagnostic[] };

/** Не шаги алгоритма: в схему не попадают, предупреждений не дают (design, решение 8). */
const skipped = new Set([
  "comment",
  "import_statement",
  "import_from_statement",
  "future_import_statement",
  "pass_statement",
]);

const keywords: Readonly<Record<string, string>> = {
  for_statement: "for",
  function_definition: "def",
  class_definition: "class",
  decorated_definition: "def",
  return_statement: "return",
  break_statement: "break",
  continue_statement: "continue",
  try_statement: "try",
  with_statement: "with",
  match_statement: "match",
};

/** Слова составных конструкций: без `:` после них tree-sitter даёт только `ERROR` (design, решение 7). */
const compoundKeywords = new Set([
  "if",
  "elif",
  "else",
  "while",
  "for",
  "def",
  "class",
  "try",
  "except",
  "finally",
  "with",
]);

class LimitError extends Error {}

interface Context {
  readonly warnings: Diagnostic[];
  blocks: number;
}

const lineOf = (node: SyntaxNode) => node.startPosition.row + 1;
const at = (line: number, message: string): Diagnostic => ({
  line,
  message: `Строка ${line}: ${message}`,
});

function field(node: SyntaxNode, name: string): SyntaxNode {
  const child = node.childForFieldName(name);
  if (!child) throw new Error(`У узла ${node.type} нет поля ${name}`);
  return child;
}

function containsInputCall(node: SyntaxNode): boolean {
  if (node.type === "call" && node.childForFieldName("function")?.text === "input") return true;
  return node.namedChildren.some(containsInputCall);
}

function inputText(target: SyntaxNode | null): Text {
  if (!target) return joinText("Ввод");
  const names = ["pattern_list", "tuple_pattern", "list_pattern"].includes(target.type)
    ? target.namedChildren.filter((child) => child.type !== "comment").map(expression)
    : [expression(target)];
  return joinText("Ввод ", joinWith(names, ", "));
}

function outputText(call: SyntaxNode): Text {
  const args = printArguments(field(call, "arguments"));
  return args.length === 0 ? joinText("Вывод") : joinText("Вывод: ", joinWith(args, ", "));
}

function unsupported(node: SyntaxNode, keyword: string, context: Context): Step {
  const line = lineOf(node);
  context.warnings.push(at(line, `${keyword} пока не поддерживается`));
  return { kind: "unsupported", line, keyword, firstLine: (node.text.split("\n")[0] ?? "").trim() };
}

function expressionStatement(node: SyntaxNode): Step {
  const line = lineOf(node);
  const [inner, ...rest] = node.namedChildren;
  if (!inner || rest.length > 0) return { kind: "process", line, text: expression(node) };
  if (inner.type === "assignment") {
    const right = inner.childForFieldName("right");
    if (right && containsInputCall(right)) {
      return { kind: "input", line, text: inputText(inner.childForFieldName("left")) };
    }
    return { kind: "process", line, text: assignment(inner) };
  }
  if (inner.type === "augmented_assignment")
    return { kind: "process", line, text: augmentedAssignment(inner) };
  if (inner.type === "call") {
    const name = inner.childForFieldName("function")?.text;
    if (name === "print") return { kind: "output", line, text: outputText(inner) };
    if (name === "input") return { kind: "input", line, text: inputText(null) };
  }
  return { kind: "process", line, text: expression(inner) };
}

function ifStatement(node: SyntaxNode, depth: number, context: Context): Step {
  const alternatives = node.children.filter(
    (child) => child.type === "elif_clause" || child.type === "else_clause",
  );
  let otherwise: readonly Step[] = [];
  for (const clause of alternatives.toReversed()) {
    if (clause.type === "else_clause") {
      otherwise = block(field(clause, "body"), depth + 1, context);
    } else {
      context.blocks += 1;
      otherwise = [
        {
          kind: "if",
          line: lineOf(clause),
          condition: expression(field(clause, "condition")),
          then: block(field(clause, "consequence"), depth + 1, context),
          else: otherwise,
        },
      ];
    }
  }
  return {
    kind: "if",
    line: lineOf(node),
    condition: expression(field(node, "condition")),
    then: block(field(node, "consequence"), depth + 1, context),
    else: otherwise,
  };
}

function statement(node: SyntaxNode, depth: number, context: Context): Step | undefined {
  if (skipped.has(node.type)) return undefined;
  context.blocks += 1;
  if (context.blocks + 2 > limits.blocks) throw new LimitError(limitMessages.blocks);
  switch (node.type) {
    case "expression_statement":
      return expressionStatement(node);
    case "if_statement":
      return ifStatement(node, depth, context);
    case "while_statement":
      if (node.childForFieldName("alternative")) return unsupported(node, "while … else", context);
      return {
        kind: "while",
        line: lineOf(node),
        condition: expression(field(node, "condition")),
        body: block(field(node, "body"), depth + 1, context),
      };
    default:
      return unsupported(node, keywords[node.type] ?? node.children[0]?.text ?? node.type, context);
  }
}

function block(node: SyntaxNode, depth: number, context: Context): Step[] {
  if (depth > limits.depth) throw new LimitError(limitMessages.depth);
  return node.namedChildren.flatMap((child) => statement(child, depth, context) ?? []);
}

const headerKeyword = new RegExp(`^\\s*(?:async\\s+)?(?:${[...compoundKeywords].join("|")})\\b`);

/** Строка без строковых литералов и комментария — чтобы `:`, `#` и скобки в тексте не мешали. */
const stripStringsAndComment = (line: string) =>
  line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""').replace(/#.*$/, "");

const bracketDelta = (line: string) =>
  (line.match(/[([{]/g)?.length ?? 0) - (line.match(/[)\]}]/g)?.length ?? 0);

/**
 * Строки, где слово составной конструкции (`if`, `while`, `else` …) без `:` (design, решение 7).
 * tree-sitter в этом случае даёт `ERROR`, часто на следующей строке, — поэтому ищем по тексту.
 * Заголовок в скобках на несколько строк читается целиком.
 */
function missingColonLines(code: string): number[] {
  const lines = code.split("\n").map(stripStringsAndComment);
  const result: number[] = [];
  let depth = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (depth > 0 || !headerKeyword.test(line)) {
      depth = Math.max(0, depth + bracketDelta(line));
      continue;
    }
    let header = line;
    let open = bracketDelta(line);
    const start = i;
    while ((open > 0 || header.trimEnd().endsWith("\\")) && i + 1 < lines.length) {
      i += 1;
      header += ` ${lines[i] ?? ""}`;
      open += bracketDelta(lines[i] ?? "");
    }
    if (!header.replace(headerKeyword, "").includes(":")) result.push(start + 1);
  }
  return result;
}

/** Пропущенный узел-слово (имя, выражение) — назвать символ нельзя. */
const isNamedType = (type: string) =>
  /^[a-z]+(_[a-z]+)*$/.test(type) && !compoundKeywords.has(type);

function syntaxErrors(root: SyntaxNode): Diagnostic[] {
  const byLine = new Map<number, string>();
  const add = (line: number, message: string) => {
    // На строке — одно сообщение; названный символ точнее общей ошибки.
    if (!byLine.has(line) || byLine.get(line) === "ошибка в коде") byLine.set(line, message);
  };
  // Нет «:» — точная причина; узлы ERROR тогда её следствие, часто на другой строке.
  const colonLines = missingColonLines(root.text);
  for (const line of colonLines) add(line, "не хватает «:»");
  const visit = (node: SyntaxNode) => {
    if (node.isMissing) {
      add(lineOf(node), isNamedType(node.type) ? "ошибка в коде" : `не хватает «${node.type}»`);
    } else if (node.type === "ERROR") {
      // Внутренние ERROR — следствие внешней, их не показываем.
      if (colonLines.length === 0) add(lineOf(node), "ошибка в коде");
      return;
    }
    if (node.hasError) node.children.forEach(visit);
  };
  visit(root);
  if (byLine.size === 0) return [{ message: "Ошибка в коде" }];
  return [...byLine].sort(([a], [b]) => a - b).map(([line, message]) => at(line, message));
}

/** Структура программы по корню дерева `module`, или ошибки: синтаксис, лимиты. */
export function convertPython(root: SyntaxNode): PythonResult {
  const tooLong = checkCodeLength(root.text);
  if (tooLong) return { ok: false, errors: [{ message: tooLong }] };
  if (root.hasError) return { ok: false, errors: syntaxErrors(root) };
  const context: Context = { warnings: [], blocks: 0 };
  try {
    const body = block(root, 0, context);
    return { ok: true, program: { body }, warnings: context.warnings };
  } catch (error) {
    if (error instanceof LimitError) return { ok: false, errors: [{ message: error.message }] };
    throw error;
  }
}
