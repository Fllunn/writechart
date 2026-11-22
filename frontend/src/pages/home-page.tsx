// Все наборы Tinos 400 с unicode-range: браузер качает только нужные (латиница, кириллица).
import "@fontsource/tinos/400.css";
import { useMemo, useState } from "react";
import { CodeInput } from "@/features/flowchart/code-input";
import { FlowchartView } from "@/features/flowchart/flowchart-view";
import { sampleCode } from "@/features/flowchart/sample-code";
import { useFlowchart } from "@/features/flowchart/use-flowchart";

export function HomePage() {
  const [code, setCode] = useState(sampleCode);
  const { svg, stale, errors, warnings } = useFlowchart(code);
  const errorLines = useMemo(
    () => new Set(errors.flatMap((error) => (error.line === undefined ? [] : [error.line]))),
    [errors],
  );

  return (
    <main className="mx-auto flex min-h-svh max-w-screen-2xl flex-col gap-4 p-4">
      <h1 className="text-3xl font-bold">Writechart</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            Язык
            <select className="rounded-md border bg-background px-2 py-1" defaultValue="python">
              <option value="python">Python</option>
            </select>
          </label>
          <CodeInput
            value={code}
            onChange={setCode}
            errorLines={errorLines}
            label="Код программы"
          />
        </section>
        <section className="flex flex-col gap-2">
          <FlowchartView svg={svg} stale={stale} />
          {errors.length > 0 && (
            <ul aria-label="Ошибки" className="flex flex-col gap-1 text-sm text-destructive">
              {errors.map((error) => (
                <li key={error.message}>{error.message}</li>
              ))}
            </ul>
          )}
          {warnings.length > 0 && (
            <ul aria-label="Предупреждения" className="flex flex-col gap-1 text-sm text-amber-800">
              {warnings.map((warning) => (
                <li key={warning.message}>{warning.message}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
