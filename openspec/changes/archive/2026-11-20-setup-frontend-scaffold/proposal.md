# Proposal

## Why

В `frontend/` пока только `package.json` и `AGENTS.md`. Писать редактор и экраны не на чем. Нужен каркас SPA с библиотеками из ADR-0002 и ADR-0008, тестами компонентов (ADR-0009) и сборкой в CI. Тогда следующие изменения займутся уже функциями, а не настройкой.

Это первое из трёх изменений (решение человека): фронт → бэк → Playwright.

## What Changes

- **Vite 8 + React 19** в `frontend/`: `index.html`, `src/main.tsx`, `vite.config.ts`, `tsconfig.json`.
- **React Router 8, data mode** (решение человека): `createBrowserRouter` + `RouterProvider`. Один маршрут `/`: главная страница-заглушка. Страницы 404 нет (решение человека: «без лишнего кода»).
- **TanStack Query**: `QueryClientProvider` подключён сразу. **Zustand** не ставим: он появится вместе с первым настоящим состоянием интерфейса (решение человека).
- **Tailwind CSS 4 + shadcn/ui** (решение человека: сразу, основа Base UI, стиль nova): `shadcn init` создаёт `components.json`, `src/lib/utils.ts` и CSS-переменные темы. Компоненты не добавляем, пока они не нужны.
- **Минимальный каркас** (решение человека): только файлы, без которых он не работает. Правила структуры `src/` (папки, имена, где тесты) решим с первыми экранами.
- **Тесты**: Vitest + React Testing Library + jsdom (решение человека). Один тест: главная страница рендерится.
- **Oxlint**: плагины `react` (в него входят правила хуков, `react-hooks`) и `jsx-a11y` (решение человека: все три).
- **Скрипты**: `dev`, `build`, `typecheck`, `test` в `frontend/`; в корне `yarn dev` и `yarn build` через Turborepo.
- **CI**: шаг `yarn build` после `yarn test` (решение человека).
- **Документация**: `AGENTS.md` (корень и `frontend/`), `docs/architecture.md`.

Вне рамок: каркас бэка, Zustand, страница 404, правила структуры `src/`, компоненты shadcn/ui, прокси к API, Playwright и E2E, React Compiler, TanStack Query Devtools, деплой.

## Capabilities

### New Capabilities

Нет. Заглушка главной страницы — не поведение продукта, поэтому `skip_specs: true`, как в прошлых изменениях по инструментам. Спеки появятся с первыми функциями.

### Modified Capabilities

Нет.

## Impact

- Новые файлы в `frontend/` (исходники, конфиги Vite, TypeScript, shadcn/ui).
- Новые зависимости только в `frontend/package.json` (список и версии в design).
- Правки: корневой `package.json` (скрипты), `turbo.json` (задачи `build`, `dev`), `.oxlintrc.json`, `.github/workflows/ci.yml`, `yarn.lock`, `AGENTS.md`, `frontend/AGENTS.md`, `docs/architecture.md`.
- CI станет дольше на время сборки фронта. Насколько — не знаю, станет видно по первому запуску.
