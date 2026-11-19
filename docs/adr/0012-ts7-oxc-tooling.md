# ADR-0012: TypeScript 7, Oxlint, oxfmt и knip вместо ESLint и Prettier

Статус: принято · 2026-11-19 · частично заменяет [ADR-0009](0009-testing.md) (линтер и форматтер)

## Контекст

ADR-0009 выбрал ESLint + Prettier. Команда выбрала TypeScript 7 — компилятор, переписанный на Go: по данным Microsoft, полная сборка в 8–12 раз быстрее, чем на TypeScript 6 ([анонс 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)). У TS 7.0 нет программного API; новый API обещан в 7.1.

typescript-eslint 8.73.0 требует `typescript <6.1.0` и при TS 7 падает с ошибкой «typescript-eslint does not support TS 7.0» (проверено на тестовом проекте 19.11.2026). Без typescript-eslint ESLint не читает файлы `.ts`. Вместе с ним не работает и `eslint-plugin-import-x`, которым ADR-0005 заменял строгость PnP (запрет импорта необъявленных пакетов).

## Решение

- **TypeScript 7** (`typescript@~7.0.2`) в каждом пакете, где есть `typecheck`. Второй версии TypeScript в проекте нет.
- **Oxlint** + **oxlint-tsgolint** — линтер; правила по типам считает сам TS 7. Запуск из корня: `oxlint --type-aware --deny-warnings`.
- **oxfmt** — форматтер из того же проекта Oxc вместо Prettier. Версия закреплена точно, пока нет 1.0.
- **knip** `--strict` — запрет импорта пакетов, не объявленных в `package.json` своего пакета (замена `import/no-extraneous-dependencies` из ADR-0005).

Vitest, React Testing Library, Supertest, Playwright и база в тестах из ADR-0009 не меняются.

## Варианты

- **ESLint + TypeScript 6.** Проверено и привычно, но без скорости TS 7.
- **ESLint + связка TS 6 и TS 7** (TS 6 под алиасом для typescript-eslint, TS 7 для `tsc`). Так советует Microsoft и так сделано в VS Code. Минус: две версии TypeScript и путаница с командой `tsc`.
- **Biome.** Линтер и форматтер в одном, есть правило `noUndeclaredDependencies`. Минус: типы выводит своим кодом, без компилятора TypeScript, поэтому проверки по типам слабее.
- **Prettier** вместо oxfmt. Стабилен, но медленнее; oxfmt берёт вывод Prettier за основу.
- Корневой `package.json` 73 крупных open-source проектов (19.11.2026, выборка составлена агентом): ESLint — 38, Oxlint — 22 (из них 11 с проверками по типам через TS 7: Vite, VS Code, Sentry, tRPC и др.), Biome — 8.
- Скачивания в npm за неделю 12–18.11.2026: eslint — 216,3 млн, oxlint — 52,3 млн, @biomejs/biome — 29,3 млн.

## Последствия

- Проверка типов и линтер работают на одном компиляторе — TS 7.
- Плагины ESLint недоступны. Правила React (`react/rules-of-hooks`, `react/exhaustive-deps`, `react/only-export-components`) есть в Oxlint; их включит изменение с каркасом фронта.
- oxfmt до 1.0: обновлять отдельным PR с `yarn format`.
- knip `--strict` не проверяет тестовые файлы — импорт необъявленного пакета в `*.test.ts` не ловится.
- Инструменты, которым нужен API TypeScript, пока не работают с TS 7. При добавлении нового инструмента проверять, зависит ли он от пакета `typescript`.
