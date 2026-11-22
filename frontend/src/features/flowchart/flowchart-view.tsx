import DOMPurify from "dompurify";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface FlowchartViewProps {
  /** SVG ядра; `null` — схемы ещё нет. */
  readonly svg: string | null;
  /** Схема от прежнего кода: в текущем ошибка. */
  readonly stale: boolean;
}

/** Схема на странице. SVG ядра проходит DOMPurify: второй слой к белому списку строителя. */
export function FlowchartView({ svg, stale }: FlowchartViewProps) {
  const clean = useMemo(
    () => (svg === null ? "" : DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })),
    [svg],
  );

  return (
    <figure
      aria-label="Блок-схема"
      className="relative min-h-80 overflow-auto rounded-md border bg-white p-4"
    >
      {stale && (
        <figcaption className="absolute top-2 right-2 rounded-sm bg-amber-100 px-2 py-1 text-sm font-medium text-amber-900">
          схема устарела
        </figcaption>
      )}
      <div
        data-testid="flowchart-svg"
        // Схема ужимается по ширине области, но не крупнее 100 % (размеры SVG в мм).
        className={cn(
          "transition-opacity [&_svg]:h-auto [&_svg]:max-w-full",
          stale && "opacity-40",
        )}
        // Очищено DOMPurify выше.
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </figure>
  );
}
