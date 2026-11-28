// Программы-примеры: по одной на сценарий спеки flowchart-generation, где строится схема.
// Их проверяет gost-check, по ним сняты эталонные SVG (src/__snapshots__/).

export const scenarioExamples: Readonly<Record<string, string>> = {
  "empty-program": "",
  "simple-assignment": "s = s + i\n",
  "augmented-assignment": "count += 1\n",
  "function-call": "foo(x)\n",
  "input-number": 'n = int(input("Введите n: "))\n',
  "input-many": "a, b = map(int, input().split())\n",
  "print-text-and-variable": 'print("Сумма:", s)\n',
  "print-f-string": 'print(f"Сумма: {s}")\n',
  "print-variables": "print(a, b)\n",
  "if-without-else": "if x > 0:\n    print(x)\n",
  "if-elif-else": "if a:\n    x = 1\nelif b:\n    x = 2\nelse:\n    x = 3\n",
  "while-simple": "while i <= n:\n    i = i + 1\n",
  "while-nested": "while i < n:\n    j = 0\n    while j < n:\n        j += 1\n    i += 1\n",
  "condition-mod-logic": "if i % 2 == 0 and n != 0:\n    print(i)\n",
  "floor-division": "d = n // 10\n",
  power: "y = x ** (n + 1)\n",
  "comparison-in-assignment": "flag = a == b\n",
  "short-text": "x = 1\n",
  "long-text": 'print("Сумма элементов массива, которые делятся на три без остатка:", s)\n',
  "data-and-long-process":
    "n = int(input())\ns = 0\nvery_long_total_name = count_value + next_count_value\n",
  "straight-sequence": "x = 1\ny = very_long_total_name + next_count_value\n",
  "nested-long-condition":
    "while a:\n    if b:\n        x = 1\n    else:\n        if average_temperature > maximum_allowed_temperature:\n            x = 2\n",
  "starter-example": `n = int(input("Введите n: "))
s = 0
i = 1
while i <= n:
    if i % 2 == 0:
        s += i
    i += 1
print("Сумма чётных:", s)
`,
  "unsupported-for": "s = 0\nfor i in range(n):\n    print(i)\nprint(s)\n",
  "script-tag": 'print("<script>alert(1)</script>")\n',
  "attribute-escape": 's = "\\"><svg onload=alert(1)>"\n',
  "direction-mark": 'print("ab\u202Ecd")\n',
};

// \u0422\u0438\u043F\u0438\u0447\u043D\u044B\u0435 \u043B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u044B\u0435 (\u043F\u043E \u043F\u0440\u043E\u0441\u044C\u0431\u0435 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430 22.11.2026): \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u0441\u0432\u0435\u0440\u044F\u0435\u0442 \u044D\u0442\u0430\u043B\u043E\u043D\u044B \u0433\u043B\u0430\u0437\u0430\u043C\u0438 \u0441\u043E \u0441\u0432\u043E\u0438\u043C\u0438 \u0441\u0445\u0435\u043C\u0430\u043C\u0438.
export const labExamples: Readonly<Record<string, string>> = {
  "lab-digit-sum": `n = int(input("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043B\u043E: "))
s = 0
while n > 0:
    s += n % 10
    n //= 10
print("\u0421\u0443\u043C\u043C\u0430 \u0446\u0438\u0444\u0440:", s)
`,
  "lab-gcd": `a, b = map(int, input().split())
while a != b:
    if a > b:
        a -= b
    else:
        b -= a
print(f"\u041D\u041E\u0414 = {a}")
`,
  "lab-quadratic": `import math

a = float(input("a = "))
b = float(input("b = "))
c = float(input("c = "))
d = b ** 2 - 4 * a * c
if d > 0:
    x1 = (-b + math.sqrt(d)) / (2 * a)
    x2 = (-b - math.sqrt(d)) / (2 * a)
    print("x1 =", x1, "x2 =", x2)
elif d == 0:
    x = -b / (2 * a)
    print("x =", x)
else:
    print("\u041A\u043E\u0440\u043D\u0435\u0439 \u043D\u0435\u0442")
`,
};
