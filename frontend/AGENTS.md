# AGENTS.md — frontend

Сначала прочитай корневой [`../AGENTS.md`](../AGENTS.md): процесс OpenSpec и правила Git действуют и здесь.

## Что здесь

SPA для браузера: React 19 + Vite 8. Установлено:
- React Router 8, data mode — страницы и переходы; маршруты описаны одним массивом в `src/routes.tsx`. `createBrowserRouter` бери из `react-router`, а `RouterProvider` — из `react-router/dom` (эта версия подключает `flushSync` из `react-dom`);
- TanStack Query — всё, что приходит с сервера (кэш, повторы, обновление); `QueryClientProvider` подключён в `src/main.tsx`;
- Tailwind CSS 4 (плагин `@tailwindcss/vite`, настройка в `src/index.css`);
- shadcn/ui на основе Base UI, стиль nova (`components.json`).

Схема: `web-tree-sitter`, `tree-sitter-python`, `dompurify`, `@fontsource/tinos` и ядро `@writechart/core` (раздел «Схема» ниже).

Решено, но пока не установлено: Zustand — состояние интерфейса, которого нет на сервере (тема, выделенный блок, масштаб).

Алиас `@/` указывает на `src/` (`paths` в `tsconfig.json` и `tsconfig.app.json`, `resolve.alias` в `vite.config.ts`).

TypeScript разделён, как в шаблоне Vite: `tsconfig.app.json` — код в `src/` с типами браузера (`vite/client`) и `allowImportingTsExtensions` (исходники ядра импортируют свои файлы с `.ts`), `tsconfig.node.json` — `vite.config.ts` с типами Node, `tsconfig.json` — ссылки на оба. Проверка — `tsc -b`. Поэтому `process`, `Buffer` и `node:*` в `src/` дают ошибку типов.

## Схема: `src/features/flowchart/`

Главная страница строит блок-схему из кода в браузере, код не уходит на сервер.

- `flowchart.worker.ts` — Web Worker: грузит `web-tree-sitter` и грамматику Python, разбирает код, вызывает `flowchart` из `@writechart/core/flowchart`. Сообщения — `flowchart-protocol.ts`.
- wasm подключается `?url`-импортом (`web-tree-sitter/web-tree-sitter.wasm?url`, `tree-sitter-python/tree-sitter-python.wasm?url`) и передаётся в `Parser.init({ locateFile })` и `Language.load`: так Vite кладёт оба файла в `dist/assets`. Воркер собирается форматом `es` (`worker.format` в `vite.config.ts`).
- `use-flowchart.ts` — хук: один воркер, только последний код, таймаут 2 с (`terminate()` и новый воркер), последняя удачная схема при ошибке.
- `flowchart-view.tsx` — вставка SVG. SVG из ядра всегда проходит `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })` перед `dangerouslySetInnerHTML`: второй слой к белому списку строителя ядра.
- `code-input.tsx` — поле кода без зависимостей: номера строк, Tab/Shift+Tab, выделение строк с ошибкой.

Новая функция со своими компонентами, хуками и воркерами — своя папка `src/features/<имя>/`; страница в `src/pages/` её только собирает. В jsdom нет `Worker`: тест страницы подменяет его `vi.stubGlobal`.

## shadcn/ui

Компоненты добавляй, только когда они нужны:

```bash
cd frontend
yarn dlx shadcn@4.23.0 add <компонент>
```

Пакет `shadcn` стоит в `dependencies`: из него `src/index.css` берёт `shadcn/tailwind.css`. `cn` для классов — в `src/lib/utils.ts`.

Все команды CLI запускай из `frontend/`. Из корня репозитория CLI отвечает `monorepo_root`, поэтому авто-контекст скилла `shadcn` (`shadcn info`) там пустой. Контекст проекта (алиасы, стиль, база, пути) получай так:

```bash
cd frontend
yarn dlx shadcn@4.23.0 info
```

## Правила папки

- Данные с сервера держи в TanStack Query, не копируй их в Zustand.
- Типы и проверку данных API бери из `@writechart/shared`, не описывай их здесь второй раз.
- Не импортируй код из `backend/`.
- Импортируй библиотеки по конкретным путям, не через barrel-файлы с `export *`.
- Не импортируй `node:*` в `src/`: это код для браузера.
- Компонент держи в файле, который экспортирует только компоненты (константы можно). Иначе не работает Fast Refresh; это проверяет правило Oxlint `react/only-export-components`.
- Страницы лежат в `src/pages/`, по файлу на страницу (`src/pages/home-page.tsx`). Массив маршрутов в `src/routes.tsx` только импортирует их.
- Имена файлов — kebab-case (`home-page.tsx`), как у компонентов shadcn (`components/ui/button.tsx`). Имена компонентов внутри — PascalCase (`HomePage`).
- Код функции — в `src/features/<имя>/`, тесты рядом (`code-input.test.tsx`).
- Тесты: Vitest + React Testing Library на jsdom (`yarn workspace @writechart/frontend test`), для сложных форм и части обычных компонентов. Импорты из `vitest` явные (`globals` выключен), поэтому DOM после каждого теста чистит `afterEach(cleanup)` в `src/test-setup.ts`. E2E главных сценариев на Playwright — в пакете [`e2e/`](../e2e/AGENTS.md).
