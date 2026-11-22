import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { CodeInput } from "./code-input";

function Harness({ initial, errorLines }: { initial: string; errorLines?: ReadonlySet<number> }) {
  const [value, setValue] = useState(initial);
  return (
    <CodeInput
      value={value}
      onChange={setValue}
      label="Код"
      {...(errorLines ? { errorLines } : {})}
    />
  );
}

const field = () => screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Код" });
const lineNumbers = () => screen.getByTestId("line-numbers").textContent;

describe("поле кода", () => {
  test("Tab в начале строки вставляет четыре пробела и не уводит фокус", () => {
    render(<Harness initial="x = 1" />);
    const textarea = field();
    textarea.focus();
    textarea.setSelectionRange(0, 0);
    const notPrevented = fireEvent.keyDown(textarea, { key: "Tab" });
    expect(notPrevented).toBe(false);
    expect(textarea.value).toBe("    x = 1");
    expect(textarea.selectionStart).toBe(4);
    expect(textarea).toHaveFocus();
  });

  test("Shift+Tab убирает до четырёх пробелов в начале строки", () => {
    render(<Harness initial={"if a:\n      x = 1"} />);
    const textarea = field();
    textarea.setSelectionRange(14, 14);
    fireEvent.keyDown(textarea, { key: "Tab", shiftKey: true });
    expect(textarea.value).toBe("if a:\n  x = 1");
  });

  test("Tab с выделением нескольких строк сдвигает их все", () => {
    render(<Harness initial={"a\nb"} />);
    const textarea = field();
    textarea.setSelectionRange(0, 3);
    fireEvent.keyDown(textarea, { key: "Tab" });
    expect(textarea.value).toBe("    a\n    b");
  });

  test("номера строк растут с числом строк", () => {
    render(<Harness initial="a" />);
    expect(lineNumbers()).toBe("1");
    fireEvent.change(field(), { target: { value: "a\nb\nc" } });
    expect(lineNumbers()).toBe("123");
  });

  test("номер строки с ошибкой выделен", () => {
    render(<Harness initial={"a\nb\nc"} errorLines={new Set([2])} />);
    const marked = screen.getByTestId("line-numbers").querySelectorAll("[data-error]");
    expect([...marked].map((node) => node.textContent)).toEqual(["2"]);
  });
});
