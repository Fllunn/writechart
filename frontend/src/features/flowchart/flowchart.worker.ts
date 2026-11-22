// Воркер схемы: разбор tree-sitter и ядро вне главного потока. Код не уходит из браузера.
import { checkCodeLength, flowchart } from "@writechart/core/flowchart";
import pythonWasmUrl from "tree-sitter-python/tree-sitter-python.wasm?url";
import { Language, Parser } from "web-tree-sitter";
import treeSitterWasmUrl from "web-tree-sitter/web-tree-sitter.wasm?url";
import type { FlowchartRequest, FlowchartResponse } from "./flowchart-protocol";

interface WorkerScope {
  onmessage: ((event: MessageEvent<FlowchartRequest>) => void) | null;
  postMessage(message: FlowchartResponse): void;
}

const scope = globalThis as unknown as WorkerScope;

async function createParser(): Promise<Parser> {
  // wasm лежит рядом со сборкой (`?url`), а не там, где его ищет загрузчик по умолчанию.
  await Parser.init({ locateFile: () => treeSitterWasmUrl });
  const parser = new Parser();
  parser.setLanguage(await Language.load(pythonWasmUrl));
  return parser;
}

const parserPromise = createParser();

parserPromise.then(
  () => scope.postMessage({ type: "ready" }),
  (error: unknown) =>
    scope.postMessage({
      type: "failed",
      message: error instanceof Error ? error.message : String(error),
    }),
);

scope.onmessage = (event) => {
  void parserPromise.then((parser) => {
    const { code } = event.data;
    const tooLong = checkCodeLength(code);
    if (tooLong) {
      scope.postMessage({
        type: "result",
        svg: null,
        warnings: [],
        errors: [{ message: tooLong }],
      });
      return;
    }
    const tree = parser.parse(code);
    if (!tree) {
      scope.postMessage({
        type: "result",
        svg: null,
        warnings: [],
        errors: [{ message: "Ошибка в коде" }],
      });
      return;
    }
    try {
      scope.postMessage({ type: "result", ...flowchart(tree.rootNode) });
    } finally {
      tree.delete();
    }
  });
};
