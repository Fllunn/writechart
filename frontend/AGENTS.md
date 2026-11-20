# AGENTS.md — frontend

Сначала прочитай корневой [`../AGENTS.md`](../AGENTS.md): процесс OpenSpec и правила Git действуют и здесь.

## Что здесь

SPA для браузера: React 19 + Vite 8. Установлено:
- React Router 8, data mode — страницы и переходы; маршруты описаны одним массивом в `src/routes.tsx`. `createBrowserRouter` бери из `react-router`, а `RouterProvider` — из `react-router/dom` (эта версия подключает `flushSync` из `react-dom`);
- TanStack Query — всё, что приходит с сервера (кэш, повторы, обновление); `QueryClientProvider` подключён в `src/main.tsx`;
- Tailwind CSS 4 (плагин `@tailwindcss/vite`, настройка в `src/index.css`);
- shadcn/ui на основе Base UI, стиль nova (`components.json`).

Решено, но пока не установлено: Zustand — состояние интерфейса, которого нет на сервере (тема, выделенный блок, масштаб).

Алиас `@/` указывает на `src/` (`paths` в `tsconfig.json` и `tsconfig.app.json`, `resolve.alias` в `vite.config.ts`).

TypeScript разделён, как в шаблоне Vite: `tsconfig.app.json` — код в `src/` с типами браузера (`vite/client`), `tsconfig.node.json` — `vite.config.ts` с типами Node, `tsconfig.json` — ссылки на оба. Проверка — `tsc -b`. Поэтому `process`, `Buffer` и `node:*` в `src/` дают ошибку типов.

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
- Остальная раскладка `src/` (где лежат тесты, папки сверх тех, что задаёт `components.json`) пока не решена: договоримся с первыми экранами.
- Тесты: Vitest + React Testing Library на jsdom (`yarn workspace @writechart/frontend test`), для сложных форм и части обычных компонентов. Импорты из `vitest` явные (`globals` выключен), поэтому DOM после каждого теста чистит `afterEach(cleanup)` в `src/test-setup.ts`. Playwright для главных сценариев появится позже.
