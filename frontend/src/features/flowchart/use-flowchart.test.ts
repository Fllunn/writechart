import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { FlowchartResponse } from "./flowchart-protocol";
import { flowchartTimeoutMs, timeoutMessage, useFlowchart } from "./use-flowchart";

/** Воркер, которым управляет тест: отвечает, когда скажут. */
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: FlowchartResponse }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(request: { code: string }) {
    this.sent.push(request.code);
  }

  terminate() {
    this.terminated = true;
  }

  reply(response: FlowchartResponse) {
    act(() => this.onmessage?.({ data: response }));
  }
}

const lastWorker = () => {
  const worker = FakeWorker.instances.at(-1);
  if (!worker) throw new Error("воркер не создан");
  return worker;
};

beforeEach(() => {
  FakeWorker.instances = [];
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useFlowchart", () => {
  test("ошибка после удачной схемы: схема остаётся и устарела; исправление — обычная", () => {
    const { result, rerender } = renderHook(({ code }) => useFlowchart(code), {
      initialProps: { code: "a" },
    });
    const worker = lastWorker();
    worker.reply({ type: "ready" });
    worker.reply({ type: "result", svg: "<svg>1</svg>", warnings: [], errors: [] });
    expect(result.current).toMatchObject({ svg: "<svg>1</svg>", stale: false });

    rerender({ code: "b" });
    worker.reply({
      type: "result",
      svg: null,
      warnings: [],
      errors: [{ line: 1, message: "Строка 1: ошибка в коде" }],
    });
    expect(result.current).toMatchObject({
      svg: "<svg>1</svg>",
      stale: true,
      errors: [{ line: 1 }],
    });

    rerender({ code: "c" });
    worker.reply({ type: "result", svg: "<svg>2</svg>", warnings: [], errors: [] });
    expect(result.current).toMatchObject({ svg: "<svg>2</svg>", stale: false, errors: [] });
  });

  test("ошибка с самого начала: схемы нет, есть сообщение", () => {
    const { result } = renderHook(() => useFlowchart("if x"));
    lastWorker().reply({ type: "ready" });
    lastWorker().reply({
      type: "result",
      svg: null,
      warnings: [],
      errors: [{ line: 1, message: "Строка 1: ошибка в коде" }],
    });
    expect(result.current).toMatchObject({ svg: null, stale: false, errors: [{ line: 1 }] });
  });

  test("пока воркер занят, уходит только последний код", () => {
    const { rerender } = renderHook(({ code }) => useFlowchart(code), {
      initialProps: { code: "a" },
    });
    const worker = lastWorker();
    worker.reply({ type: "ready" });
    rerender({ code: "b" });
    rerender({ code: "c" });
    worker.reply({ type: "result", svg: "<svg/>", warnings: [], errors: [] });
    expect(worker.sent).toEqual(["a", "c"]);
  });

  test("нет ответа 2 с — воркер остановлен, новый создан, сообщение «Схема строится слишком долго»", () => {
    const { result, rerender } = renderHook(({ code }) => useFlowchart(code), {
      initialProps: { code: "a" },
    });
    const first = lastWorker();
    first.reply({ type: "ready" });
    act(() => {
      vi.advanceTimersByTime(flowchartTimeoutMs);
    });
    expect(first.terminated).toBe(true);
    expect(result.current.errors).toEqual([{ message: timeoutMessage }]);

    const second = lastWorker();
    expect(second).not.toBe(first);
    rerender({ code: "b" });
    second.reply({ type: "ready" });
    expect(second.sent).toEqual(["b"]);
  });
});
