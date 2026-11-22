// Перевод выражений Python в математическую запись (таблица спеки flowchart-generation).
import type { SyntaxNode } from "./languages/syntax-node.ts";
import type { Text, TextPart } from "./structure.ts";

type Piece = Text | string;

/** Склеивает куски текста; соседние обычные куски сливаются в один. */
export function joinText(...pieces: readonly Piece[]): Text {
  const parts: TextPart[] = [];
  for (const piece of pieces) {
    const pieceParts: Text = typeof piece === "string" ? [{ kind: "text", text: piece }] : piece;
    for (const part of pieceParts) {
      const last = parts.at(-1);
      if (part.kind === "text" && part.text === "") continue;
      if (part.kind === "text" && last?.kind === "text") {
        parts[parts.length - 1] = { kind: "text", text: last.text + part.text };
      } else {
        parts.push(part);
      }
    }
  }
  return parts;
}

/** Склеивает тексты через разделитель. */
export function joinWith(items: readonly Text[], separator: string): Text {
  return joinText(...items.flatMap((item, i) => (i === 0 ? [item] : [separator, item])));
}

/** Текст одной строкой без разметки — для надстрочного текста. */
function flatten(text: Text): string {
  return text
    .map((part) => {
      switch (part.kind) {
        case "text":
          return part.text;
        case "sup":
          return `^${part.text}`;
        case "quoted":
          return `«${part.text}»`;
        case "break":
          return " ";
      }
    })
    .join("");
}

const operatorWords: Readonly<Record<string, string>> = {
  "*": "·",
  "%": "mod",
  and: "И",
  or: "ИЛИ",
};

const comparisonOperators: Readonly<Record<string, string>> = {
  "==": "=",
  "!=": "≠",
  "<>": "≠",
  "<=": "≤",
  ">=": "≥",
  "<": "<",
  ">": ">",
  in: "in",
  "not in": "not in",
  is: "is",
  "is not": "is not",
};

const brackets = new Set(["(", "[", "{", ")", "]", "}"]);

/** Сравнение и логика в правой части присваивания — в скобках, чтобы не спутать с `=`. */
const logicalExpressions = new Set(["comparison_operator", "boolean_operator", "not_operator"]);

/** Приоритет бинарных операций Python: больше — связывает сильнее. */
const precedence: Readonly<Record<string, number>> = {
  "|": 1,
  "^": 2,
  "&": 3,
  "<<": 4,
  ">>": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "//": 6,
  "%": 6,
  "@": 6,
  "**": 8,
};

/**
 * Правый операнд составного присваивания нужно взять в скобки: `x -= a - b` → `x = x - (a - b)`,
 * но `s += i ** 2` → `s = s + i²`.
 */
function needsParentheses(right: SyntaxNode, operator: string): boolean {
  if (right.type === "binary_operator") {
    const inner = right.childForFieldName("operator")?.type ?? "";
    return (precedence[inner] ?? 0) <= (precedence[operator] ?? 0);
  }
  return logicalExpressions.has(right.type) || right.type === "conditional_expression";
}

const operands = (node: SyntaxNode) =>
  node.namedChildren.filter((child) => child.type !== "comment");

function field(node: SyntaxNode, name: string): SyntaxNode {
  const child = node.childForFieldName(name);
  if (!child) throw new Error(`У узла ${node.type} нет поля ${name}`);
  return child;
}

/** Внутренность строки без кавычек и префикса, как в коде. */
function stringContent(node: SyntaxNode): string {
  return node.children
    .filter((child) => child.type !== "string_start" && child.type !== "string_end")
    .map((child) => child.text)
    .join("");
}

const unwrapParentheses = (node: SyntaxNode) =>
  node.type === "parenthesized_expression" ? (operands(node)[0] ?? node) : node;

/** `left op right`: степень надстрочно, целочисленное деление в ⌊ ⌋, остальное по таблице. */
function binary(left: Text, operator: string, right: SyntaxNode, wrapRight = false): Text {
  if (operator === "**") {
    return joinText(left, [{ kind: "sup", text: flatten(expression(unwrapParentheses(right))) }]);
  }
  if (operator === "//") return joinText("⌊", left, " / ", expression(right), "⌋");
  const rightText =
    wrapRight && needsParentheses(right, operator)
      ? joinText("(", expression(right), ")")
      : expression(right);
  return joinText(left, ` ${operatorWords[operator] ?? operator} `, rightText);
}

function argument(node: SyntaxNode): Text {
  if (node.type === "keyword_argument") {
    return joinText(field(node, "name").text, "=", expression(field(node, "value")));
  }
  return expression(node);
}

/** Выражение в математической записи. */
export function expression(node: SyntaxNode): Text {
  switch (node.type) {
    case "parenthesized_expression":
      return joinText("(", expression(unwrapParentheses(node)), ")");
    case "binary_operator":
      return binary(
        expression(field(node, "left")),
        field(node, "operator").type,
        field(node, "right"),
      );
    case "boolean_operator":
      return binary(
        expression(field(node, "left")),
        field(node, "operator").type,
        field(node, "right"),
      );
    case "comparison_operator":
      return joinWith(
        node.children
          .filter((child) => child.type !== "comment")
          .map((child) => {
            const operator = comparisonOperators[child.type];
            return operator === undefined ? expression(child) : joinText(operator);
          }),
        " ",
      );
    case "not_operator":
      return joinText("НЕ ", expression(field(node, "argument")));
    case "unary_operator":
      return joinText(field(node, "operator").type, expression(field(node, "argument")));
    case "true":
      return joinText("истина");
    case "false":
      return joinText("ложь");
    case "string":
      return [{ kind: "quoted", text: stringContent(node) }];
    case "concatenated_string":
      return [{ kind: "quoted", text: operands(node).map(stringContent).join("") }];
    case "call":
      return joinText(
        expression(field(node, "function")),
        "(",
        joinWith(operands(field(node, "arguments")).map(argument), ", "),
        ")",
      );
    case "attribute":
      return joinText(expression(field(node, "object")), ".", field(node, "attribute").text);
    case "subscript": {
      const [value, ...indexes] = operands(node);
      return joinText(
        value ? expression(value) : "",
        "[",
        joinWith(indexes.map(expression), ", "),
        "]",
      );
    }
    case "list":
    case "tuple":
    case "set":
    case "expression_list":
    case "pattern_list":
    case "tuple_pattern":
    case "list_pattern": {
      const open = node.children[0]?.type ?? "";
      const close = node.children.at(-1)?.type ?? "";
      return joinText(
        brackets.has(open) ? open : "",
        joinWith(operands(node).map(expression), ", "),
        brackets.has(close) ? close : "",
      );
    }
    default:
      // Имена, числа и всё, чего нет в таблице, — как в коде, пробелы схлопнуты.
      return joinText(node.text.replace(/\s+/g, " "));
  }
}

/** `a = b`, `a = b = c`, `x: int = 5` → `x = 5`, `flag = a == b` → `flag = (a = b)`. */
export function assignment(node: SyntaxNode): Text {
  const right = node.childForFieldName("right");
  if (!right) return joinText(node.text);
  const left = expression(field(node, "left"));
  if (right.type === "assignment") return joinText(left, " = ", assignment(right));
  const value = logicalExpressions.has(right.type)
    ? joinText("(", expression(right), ")")
    : expression(right);
  return joinText(left, " = ", value);
}

/** `x += 1` → `x = x + 1`. */
export function augmentedAssignment(node: SyntaxNode): Text {
  const left = expression(field(node, "left"));
  const operator = field(node, "operator").type.slice(0, -1);
  return joinText(left, " = ", binary(left, operator, field(node, "right"), true));
}

/** Аргументы `print`: строки в «ёлочках», f-строка делится на текст и выражения, именованные пропускаются. */
export function printArguments(argumentList: SyntaxNode): Text[] {
  return operands(argumentList)
    .filter((node) => node.type !== "keyword_argument")
    .flatMap((node): Text[] => {
      if (
        node.type !== "string" ||
        !node.children.some((child) => child.type === "interpolation")
      ) {
        return [expression(node)];
      }
      return node.children.flatMap((child): Text[] => {
        if (child.type === "string_content") return [[{ kind: "quoted", text: child.text }]];
        if (child.type === "interpolation") return [expression(field(child, "expression"))];
        return [];
      });
    });
}
