// Помощник тестов: настоящий разбор Python через web-tree-sitter в Node.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Language, Parser } from "web-tree-sitter";

const require = createRequire(import.meta.url);

let parserPromise: Promise<Parser> | undefined;

async function createParser(): Promise<Parser> {
  await Parser.init();
  const wasm = await readFile(require.resolve("tree-sitter-python/tree-sitter-python.wasm"));
  const language = await Language.load(new Uint8Array(wasm));
  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
}

/** Корень дерева разбора `code`. Парсер создаётся один раз на процесс. */
export async function parsePython(code: string) {
  parserPromise ??= createParser();
  const parser = await parserPromise;
  const tree = parser.parse(code);
  if (!tree) throw new Error("tree-sitter не вернул дерево");
  return tree.rootNode;
}
