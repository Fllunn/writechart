import { describe, expect, test } from "vitest";
import type { Step } from "../structure.ts";
import { parsePython } from "../test-support/parse-python.ts";
import { plainText } from "../test-support/plain-text.ts";
import { convertPython } from "./python.ts";

async function convert(code: string) {
  return convertPython(await parsePython(code));
}

async function body(code: string): Promise<readonly Step[]> {
  const result = await convert(code);
  if (!result.ok) throw new Error(result.errors.map((e) => e.message).join("\n"));
  return result.program.body;
}

/** Шаги без строк кода, текст одной строкой — так проще сравнивать. */
function outline(steps: readonly Step[]): unknown[] {
  return steps.map((step) => {
    switch (step.kind) {
      case "process":
      case "input":
      case "output":
        return { [step.kind]: plainText(step.text) };
      case "if":
        return {
          if: plainText(step.condition),
          then: outline(step.then),
          else: outline(step.else),
        };
      case "while":
        return { while: plainText(step.condition), body: outline(step.body) };
      case "unsupported":
        return { unsupported: step.firstLine };
    }
  });
}

const steps = async (code: string) => outline(await body(code));

describe("пустая программа", () => {
  test.each(["", "\n\n   \n"])("код %j — нет шагов", async (code) => {
    expect(await steps(code)).toEqual([]);
  });
});

describe("процесс", () => {
  test("простое присваивание", async () => {
    expect(await steps("s = s + i")).toEqual([{ process: "s = s + i" }]);
  });

  test.each([
    ["count += 1", "count = count + 1"],
    ["x -= a - b", "x = x - (a - b)"],
    ["x *= 2", "x = x · 2"],
    ["x /= 2", "x = x / 2"],
    ["x //= 10", "x = ⌊x / 10⌋"],
    ["x %= 3", "x = x mod 3"],
    ["x **= 2", "x = x^{2}"],
    ["s += i ** 2", "s = s + i^{2}"],
    ["x += a * b", "x = x + a · b"],
    ["x *= a + b", "x = x · (a + b)"],
  ])("составное %s → %s", async (code, text) => {
    expect(await steps(code)).toEqual([{ process: text }]);
  });

  test("простой вызов функции", async () => {
    expect(await steps("foo(x)")).toEqual([{ process: "foo(x)" }]);
  });

  test("строка кода у шага", async () => {
    const [step] = await body("\n\nx = 1");
    expect(step?.line).toBe(3);
  });
});

describe("ввод", () => {
  test("ввод числа", async () => {
    expect(await steps('n = int(input("Введите n: "))')).toEqual([{ input: "Ввод n" }]);
  });

  test("ввод нескольких переменных", async () => {
    expect(await steps("a, b = map(int, input().split())")).toEqual([{ input: "Ввод a, b" }]);
  });
});

describe("вывод", () => {
  test("текст и переменная", async () => {
    expect(await steps('print("Сумма:", s)')).toEqual([{ output: "Вывод: «Сумма:», s" }]);
  });

  test("f-строка", async () => {
    expect(await steps('print(f"Сумма: {s}")')).toEqual([{ output: "Вывод: «Сумма: », s" }]);
  });

  test("только переменные", async () => {
    expect(await steps("print(a, b)")).toEqual([{ output: "Вывод: a, b" }]);
  });

  test("именованные аргументы не показываются", async () => {
    expect(await steps('print(a, sep="", end="\n")')).toEqual([{ output: "Вывод: a" }]);
  });
});

describe("ветвление", () => {
  test("if без else", async () => {
    expect(await steps("if x > 0:\n    print(x)")).toEqual([
      { if: "x > 0", then: [{ output: "Вывод: x" }], else: [] },
    ]);
  });

  test("if, elif, else — elif вложен в ветку «нет»", async () => {
    const code = "if a:\n    x = 1\nelif b:\n    x = 2\nelse:\n    x = 3";
    expect(await steps(code)).toEqual([
      {
        if: "a",
        then: [{ process: "x = 1" }],
        else: [{ if: "b", then: [{ process: "x = 2" }], else: [{ process: "x = 3" }] }],
      },
    ]);
  });

  test("elif получает свою строку кода", async () => {
    const [step] = await body("if a:\n    x = 1\nelif b:\n    x = 2");
    expect(step?.kind === "if" && step.else[0]?.line).toBe(3);
  });
});

describe("цикл", () => {
  test("простой цикл", async () => {
    expect(await steps("while i <= n:\n    i = i + 1")).toEqual([
      { while: "i ≤ n", body: [{ process: "i = i + 1" }] },
    ]);
  });

  test("вложенный цикл", async () => {
    const code = "while i < n:\n    while j < n:\n        j += 1\n    i += 1";
    expect(await steps(code)).toEqual([
      {
        while: "i < n",
        body: [{ while: "j < n", body: [{ process: "j = j + 1" }] }, { process: "i = i + 1" }],
      },
    ]);
  });
});

describe("неподдерживаемые конструкции", () => {
  test("цикл for: блок с первой строкой, тело не нарисовано, предупреждение, соседи на месте", async () => {
    const result = await convert("s = 0\nfor i in range(n):\n    print(i)\nprint(s)");
    if (!result.ok) throw new Error("ошибка");
    expect(outline(result.program.body)).toEqual([
      { process: "s = 0" },
      { unsupported: "for i in range(n):" },
      { output: "Вывод: s" },
    ]);
    expect(result.warnings.map((w) => w.message)).toEqual(["Строка 2: for пока не поддерживается"]);
  });

  test.each([
    ["def f(x):\n    return x", "def"],
    ["class A:\n    pass", "class"],
    ["while True:\n    break", "break"],
    ["while True:\n    continue", "continue"],
    ["try:\n    x = 1\nexcept E:\n    x = 2", "try"],
    ["with open(f) as g:\n    x = 1", "with"],
    ["match x:\n    case 1:\n        y = 1", "match"],
    ["while a:\n    x = 1\nelse:\n    x = 2", "while … else"],
  ])("%j → предупреждение про %s", async (code, keyword) => {
    const result = await convert(code);
    if (!result.ok) throw new Error(result.errors.map((e) => e.message).join("\n"));
    expect(result.warnings.map((w) => w.message)).toContain(
      `Строка ${code.startsWith("while True") ? 2 : 1}: ${keyword} пока не поддерживается`,
    );
  });

  test("return на верхнем уровне — тоже блок с пометкой", async () => {
    expect(await steps("return 1")).toEqual([{ unsupported: "return 1" }]);
  });
});

describe("не шаги алгоритма", () => {
  test("import, from … import, комментарии и pass не рисуются и не дают предупреждений", async () => {
    const result = await convert(
      "import math\nfrom os import path\n# комментарий\npass\nx = 1  # ещё\n",
    );
    if (!result.ok) throw new Error("ошибка");
    expect(outline(result.program.body)).toEqual([{ process: "x = 1" }]);
    expect(result.warnings).toEqual([]);
  });
});

describe("ошибки разбора", () => {
  const errors = async (code: string) => {
    const result = await convert(code);
    if (result.ok) throw new Error("ждали ошибку");
    return result.errors.map((e) => e.message);
  };

  test("забыто двоеточие после if в строке 4", async () => {
    expect(await errors("n = 1\ns = 0\ni = 1\nif x > 0\n    print(x)\n")).toEqual([
      "Строка 4: не хватает «:»",
    ]);
  });

  test.each([
    ["while i <= n\n    i = i + 1", "Строка 1: не хватает «:»"],
    ["if a:\n    x = 1\nelse\n    x = 2", "Строка 3: не хватает «:»"],
    ["def f()\n    pass", "Строка 1: не хватает «:»"],
  ])("двоеточие: %j", async (code, message) => {
    expect(await errors(code)).toEqual([message]);
  });

  test("без двоеточия у while перед вложенным if — строка while, а не if", async () => {
    const code =
      "n = 1\ns = 0\ni = 1\nwhile i <= n\n    if i % 2 == 0:\n        s += i\n    i += 1\n";
    expect(await errors(code)).toEqual(["Строка 4: не хватает «:»"]);
  });

  test("заголовок на нескольких строках в скобках — не ошибка двоеточия", async () => {
    expect((await convert("if (a and\n        b):\n    x = 1\n")).ok).toBe(true);
  });

  test("двоеточие называется и при другой ошибке ниже", async () => {
    expect(await errors("while i <= n\n    i += 1\nx = (1 +\n")).toContain(
      "Строка 1: не хватает «:»",
    );
  });

  test("незакрытая скобка — ошибка с номером строки", async () => {
    const messages = await errors("x = 1\ny = (1 + 2\nz = 3\n");
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toMatch(/^Строка \d+: /);
  });

  test("при ошибке схемы нет", async () => {
    const result = await convert("if x > 0\n    print(x)");
    expect(result.ok).toBe(false);
    expect("program" in result).toBe(false);
  });
});

describe("лимиты", () => {
  test("код длиннее 50 000 символов", async () => {
    const code = "x = 1\n".repeat(8400);
    expect(code.length).toBeGreaterThan(50_000);
    const result = await convert(code);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]?.message).toMatch(/^Код слишком длинный/);
  });

  const nested = (levels: number) =>
    Array.from({ length: levels }, (_, i) => `${"    ".repeat(i)}if x${i}:`).join("\n") +
    `\n${"    ".repeat(levels)}y = 1`;

  test("60 вложенных if — ошибка о глубокой вложенности", async () => {
    const result = await convert(nested(60));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]?.message).toMatch(/вложенность/);
  });

  test("50 вложенных if — схема строится", async () => {
    expect((await convert(nested(50))).ok).toBe(true);
  });

  test("больше 2000 блоков", async () => {
    const result = await convert("x = 1\n".repeat(2000));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]?.message).toMatch(/больше 2000 блоков/);
  });

  test("1998 шагов и «Начало», «Конец» — ровно 2000 блоков, схема строится", async () => {
    expect((await convert("x = 1\n".repeat(1998))).ok).toBe(true);
  });
});
