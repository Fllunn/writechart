import type { Diagnostic } from "@writechart/core/flowchart";
import { useEffect, useRef, useState } from "react";
import type { FlowchartRequest, FlowchartResponse } from "./flowchart-protocol";

/** Сколько ждать схему, прежде чем остановить воркер (design: таймаут построения). */
export const flowchartTimeoutMs = 2000;

export const timeoutMessage = "Схема строится слишком долго";

export interface FlowchartState {
  /** Последняя удачная схема (SVG ядра, ещё не очищенный). */
  readonly svg: string | null;
  /** В текущем коде ошибка: `svg` — от прежнего кода. */
  readonly stale: boolean;
  readonly errors: readonly Diagnostic[];
  readonly warnings: readonly Diagnostic[];
}

const initialState: FlowchartState = { svg: null, stale: false, errors: [], warnings: [] };

type Outcome =
  | {
      readonly kind: "result";
      readonly svg: string | null;
      readonly errors: readonly Diagnostic[];
      readonly warnings: readonly Diagnostic[];
    }
  | { readonly kind: "failure"; readonly message: string };

/**
 * Держит один воркер. Пока он занят, правки не копятся: уходит только последний код.
 * Нет ответа за `flowchartTimeoutMs` — воркер останавливается и заменяется новым.
 */
class FlowchartClient {
  #worker: Worker | undefined;
  #ready = false;
  #busy = false;
  #pending: string | null = null;
  #timer: ReturnType<typeof setTimeout> | undefined;
  readonly #onOutcome: (outcome: Outcome) => void;

  constructor(onOutcome: (outcome: Outcome) => void) {
    this.#onOutcome = onOutcome;
    this.#start();
  }

  request(code: string): void {
    this.#pending = code;
    this.#flush();
  }

  dispose(): void {
    clearTimeout(this.#timer);
    this.#worker?.terminate();
    this.#worker = undefined;
  }

  #start(): void {
    const worker = new Worker(new URL("./flowchart.worker.ts", import.meta.url), {
      type: "module",
    });
    this.#worker = worker;
    this.#ready = false;
    this.#busy = false;
    worker.onmessage = (event: MessageEvent<FlowchartResponse>) => this.#receive(event.data);
    worker.onerror = () =>
      this.#onOutcome({ kind: "failure", message: "Не удалось запустить построение схемы" });
  }

  #receive(response: FlowchartResponse): void {
    switch (response.type) {
      case "ready":
        this.#ready = true;
        break;
      case "failed":
        this.#onOutcome({
          kind: "failure",
          message: `Не удалось загрузить разбор кода: ${response.message}`,
        });
        return;
      case "result":
        clearTimeout(this.#timer);
        this.#busy = false;
        this.#onOutcome({
          kind: "result",
          svg: response.svg,
          errors: response.errors,
          warnings: response.warnings,
        });
        break;
    }
    this.#flush();
  }

  #flush(): void {
    if (!this.#worker || !this.#ready || this.#busy || this.#pending === null) return;
    const request: FlowchartRequest = { code: this.#pending };
    this.#pending = null;
    this.#busy = true;
    this.#worker.postMessage(request);
    this.#timer = setTimeout(() => this.#timeout(), flowchartTimeoutMs);
  }

  #timeout(): void {
    this.#worker?.terminate();
    this.#onOutcome({ kind: "failure", message: timeoutMessage });
    // Новый воркер возьмёт код, набранный после зависшего.
    this.#start();
  }
}

/** Схема по коду: строится в воркере на каждое изменение, код не покидает браузер. */
export function useFlowchart(code: string): FlowchartState {
  const [state, setState] = useState<FlowchartState>(initialState);
  const client = useRef<FlowchartClient | null>(null);

  useEffect(() => {
    const instance = new FlowchartClient((outcome) =>
      setState((previous) =>
        outcome.kind === "failure"
          ? {
              ...previous,
              stale: previous.svg !== null,
              errors: [{ message: outcome.message }],
              warnings: [],
            }
          : outcome.svg === null
            ? {
                svg: previous.svg,
                stale: previous.svg !== null,
                errors: outcome.errors,
                warnings: outcome.warnings,
              }
            : { svg: outcome.svg, stale: false, errors: [], warnings: outcome.warnings },
      ),
    );
    client.current = instance;
    return () => {
      instance.dispose();
      client.current = null;
    };
  }, []);

  useEffect(() => {
    client.current?.request(code);
  }, [code]);

  return state;
}
