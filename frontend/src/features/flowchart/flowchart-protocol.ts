// Сообщения между страницей и воркером схемы.
import type { FlowchartResult } from "@writechart/core/flowchart";

export interface FlowchartRequest {
  readonly code: string;
}

export type FlowchartResponse =
  /** Парсер и грамматика загружены, можно слать код. */
  | { readonly type: "ready" }
  /** wasm не загрузился. */
  | { readonly type: "failed"; readonly message: string }
  | ({ readonly type: "result" } & FlowchartResult);
