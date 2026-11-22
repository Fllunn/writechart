# Proposal

## Why

Начинаем ядро Writechart: код → блок-схема по ГОСТ 19.701-90. Ядру нужен свой пакет, который импортируют фронт сейчас и бэк потом (решения человека на грилинге 21.11.2026). Сейчас такого места нет: в `shared/` по правилам только Zod-схемы, типы и константы, а из `frontend/` бэку импортировать нельзя.

Это первое из двух изменений (решение человека): каркас пакета `core/` → `add-flowchart-python` (сама схема для Python).

## What Changes

- **Новый пакет `core/` (`@writechart/core`)** — пятый воркспейс рядом с `frontend/`, `backend/`, `shared/`, `e2e/`. Без своей сборки, как `shared/`: `exports` указывают на исходники `.ts`.
- **Код ядра не зависит ни от браузера, ни от Node** (решение человека): схема в первой версии строится в браузере, но позже тот же код запустит бэк (экспорт, проверка по ГОСТ, API). Это проверяет `yarn typecheck`: в `core/` нет типов DOM и Node.
- **Те же правила синтаксиса, что в `shared/`**: импорт своих файлов с `.ts`, `import type`, без `enum` и `namespace` с кодом. Бэк в dev исполняет такие файлы через Node без сборки ([ADR-0014](../../../docs/adr/0014-backend-build-and-runtime.md)).
- **Скрипты** `typecheck` и `test` (Vitest), их подхватывают `yarn typecheck` и `yarn test` через Turborepo. Один тест-проверка инструментов, как в `shared/`.
- **Документация**: `core/AGENTS.md`, корневой `AGENTS.md`, `docs/architecture.md`, новый ADR-0016 «Ядро схем в пакете `core`».

Вне рамок (всё — в `add-flowchart-python`): tree-sitter и грамматики, модель схемы, раскладка, SVG, шрифт, проверка правил ГОСТ, страница на фронте, импорт `@writechart/core` во фронте или бэке, E2E.

## Capabilities

### New Capabilities

Нет. Пустой пакет — не поведение продукта, поэтому `skip_specs: true`, как в прошлых изменениях-каркасах. Спека `flowchart-generation` появится в `add-flowchart-python`.

### Modified Capabilities

Нет.

## Impact

- Новые файлы: `core/package.json`, `core/tsconfig.json`, `core/AGENTS.md`, `core/src/` с одним тестом, `docs/adr/0016-core-package.md`.
- Правки: корневой `package.json` (`workspaces`), `yarn.lock`, `AGENTS.md`, `docs/architecture.md`, `docs/adr/README.md`. Возможно `.oxlintrc.json` (design, решение 5).
- Новых пакетов из npm нет: `typescript`, `vite`, `vitest` тех же версий, что в `shared/`.
- `turbo.json` и CI не меняются: задачи `typecheck` и `test` подхватят новый воркспейс сами.
