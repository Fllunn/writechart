import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/** Отступ по Tab — PEP 8 (design: значения по умолчанию). */
const indent = "    ";

interface CodeInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Номера строк с ошибкой, с 1: выделяются в колонке номеров. */
  readonly errorLines?: ReadonlySet<number>;
  readonly label: string;
}

/** Убирает до четырёх пробелов в начале строки; возвращает строку и сколько убрано. */
function outdentLine(line: string): [string, number] {
  const removed = line.length - line.replace(/^ {1,4}/, "").length;
  return [line.slice(removed), removed];
}

function handleTab(textarea: HTMLTextAreaElement, outdent: boolean): void {
  const { value, selectionStart: start, selectionEnd: end } = textarea;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const multiline = value.slice(start, end).includes("\n");

  if (!outdent && !multiline) {
    textarea.setRangeText(indent, start, end, "end");
    return;
  }

  const lines = value.slice(lineStart, end).split("\n");
  if (outdent) {
    const changed = lines.map(outdentLine);
    const removedFirst = changed[0]?.[1] ?? 0;
    const removedTotal = changed.reduce((sum, [, removed]) => sum + removed, 0);
    textarea.setRangeText(changed.map(([line]) => line).join("\n"), lineStart, end);
    textarea.setSelectionRange(
      Math.max(lineStart, start - removedFirst),
      Math.max(lineStart, end - removedTotal),
    );
  } else {
    textarea.setRangeText(lines.map((line) => indent + line).join("\n"), lineStart, end);
    textarea.setSelectionRange(start + indent.length, end + indent.length * lines.length);
  }
}

/** Поле кода: номера строк, Tab и Shift+Tab для отступа. */
export function CodeInput({ value, onChange, errorLines, label }: CodeInputProps) {
  const gutter = useRef<HTMLDivElement>(null);
  const lineCount = value.split("\n").length;

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    handleTab(event.currentTarget, event.shiftKey);
    onChange(event.currentTarget.value);
  };

  return (
    <div className="flex h-full min-h-80 overflow-hidden rounded-md border bg-background font-mono text-sm leading-6">
      <div
        ref={gutter}
        aria-hidden="true"
        data-testid="line-numbers"
        className="select-none overflow-hidden border-r bg-muted px-2 py-2 text-right text-muted-foreground"
      >
        {Array.from({ length: lineCount }, (_, i) => {
          const line = i + 1;
          const isError = errorLines?.has(line) ?? false;
          return (
            <div
              key={line}
              data-error={isError || undefined}
              className={cn(
                isError && "rounded-sm bg-destructive/15 font-semibold text-destructive",
              )}
            >
              {line}
            </div>
          );
        })}
      </div>
      <textarea
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(event) => {
          if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop;
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        wrap="off"
        className="flex-1 resize-none bg-transparent px-3 py-2 outline-none"
      />
    </div>
  );
}
