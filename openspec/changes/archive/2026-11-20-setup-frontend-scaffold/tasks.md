# Tasks

## 1. Vite, React, роутер, Query

- [x] 1.1 Поставить в `frontend/` зависимости `react`, `react-dom`, `react-router`, `@tanstack/react-query` и dev-зависимости `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `@types/node` (версии из таблицы в design; на карантине — последняя разрешённая, отметить в design); проверить: `yarn install` без ошибок, версии в `frontend/package.json` совпадают с design
- [x] 1.2 Создать `index.html`, `vite.config.ts` (плагин React, алиас `@`), `src/main.tsx` (`QueryClientProvider` + `RouterProvider` с `createBrowserRouter`) и модуль с экспортируемым массивом маршрутов и заглушкой главной (позже страница вынесена в свой файл, задача 1.7) (design, решения 1–3, 6, 12; скилл `vercel-react-best-practices`); проверить: `yarn workspace @writechart/frontend dev` открывает `/` с заголовком главной
- [x] 1.3 Создать `frontend/tsconfig.json` (сначала один файл; позже разделён на три, задача 1.6, design, решение 7) и скрипты `dev`, `build`, `preview`, `typecheck`, `test` в `frontend/package.json`; проверить: `yarn typecheck` проходит, импорт через `@/` проходит проверку типов без `baseUrl`
- [x] 1.4 Добавить в корень скрипты `build` и `dev`, в `turbo.json` задачи `build` и `dev` (design, решение 10); проверить: `yarn build` создаёт `frontend/dist/index.html`
- [x] 1.5 Брать `RouterProvider` из `react-router/dom` в `main.tsx` и в тесте (design, решение 2; исправление после проверки по документации); проверить: `yarn typecheck` и `yarn test` проходят, `yarn dev` показывает главную
- [x] 1.6 Разделить `frontend/tsconfig.json` на `tsconfig.json` (`files: []`, `references`, `paths`), `tsconfig.app.json` (`src`, `types: [vite/client]`) и `tsconfig.node.json` (`vite.config.ts`, `types: [node]`), `typecheck` → `tsc -b` (design, решение 7); проверить: `yarn typecheck` проходит; `process` в файле из `src/` даёт ошибку типов; `yarn lint` (проверки по типам) и `yarn deps` проходят; `yarn dlx shadcn@4.23.0 info` видит алиас `@/`
- [x] 1.7 Перенести заглушку главной в `src/pages/home-page.tsx`, `routes.tsx` только импортирует её (design, решения 2 и 12); проверить: правило `react/only-export-components` (задача 4.2) не находит ошибок, тест проходит
- [x] 1.8 Добавить `dependsOn: ["^build"]` в задачу `build` в `turbo.json` (design, решение 10; после второго ревью); проверить: `yarn build` проходит, `turbo run build --dry=json` показывает `^build` в зависимостях задачи

## 2. Tailwind CSS и shadcn/ui

- [x] 2.1 Поставить `tailwindcss` и `@tailwindcss/vite`, подключить плагин в `vite.config.ts`, создать `src/index.css` с `@import "tailwindcss"` и импортировать его в `main.tsx`; проверить: класс Tailwind на главной меняет вид в `yarn dev`, после `yarn build` в `dist/assets/*.css` есть этот класс
- [x] 2.2 Запустить `yarn dlx shadcn@4.23.0 init --base base --preset nova --no-monorepo` в `frontend/` (design, решение 5; скилл `shadcn`); если упадёт — создать `components.json` и `src/lib/utils.ts` вручную по документации shadcn для Vite и записать причину в design; проверить: есть `components.json` с алиасом `@/` и `style: "base-nova"` (основа Base UI + стиль nova; в 4.23 это одно поле, см. design, решение 5), `src/lib/utils.ts`, переменные темы в `index.css`; список добавленных зависимостей записан в design; `yarn build` проходит

## 3. Тесты

- [x] 3.1 Поставить `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`; добавить блок `test` в `vite.config.ts` и setup-файл с `import '@testing-library/jest-dom/vitest'` (design, решение 8); проверить: `yarn workspace @writechart/frontend test` запускается
- [x] 3.2 Написать тест: `createMemoryRouter` из того же массива маршрутов, на экране заголовок главной (design, решение 8; скилл `tdd`); проверить: тест проходит, а если поменять текст заголовка — падает
- [x] 3.3 Добавить `afterEach(cleanup)` в setup-файл тестов (design, решение 8; исправление после проверки по документации); проверить: временный второй тест, который ищет заголовок первого через `queryByRole`, не находит его (DOM очищен); временный тест удалён

## 4. Oxlint

- [x] 4.1 Добавить в `.oxlintrc.json` плагины `react`, `jsx-a11y` и override `env.browser` для `frontend/**` (design, решение 9); проверить: `oxlint --rules` показывает `rules-of-hooks` и `exhaustive-deps` в плагине `react`; `yarn lint` проходит; намеренная ошибка (хук внутри `if`) ловится; в `frontend/src` нет импортов `node:*`
- [x] 4.2 Добавить в `.oxlintrc.json` правило `"react/only-export-components": ["error", { "allowConstantExport": true }]` (design, решение 9; как в шаблоне Vite `react-ts`); проверить: `yarn lint` проходит; компонент, объявленный в файле, который экспортирует не-компонент, ловится

## 5. CI и документация

- [x] 5.1 Добавить шаг `yarn build` после `yarn test` в `.github/workflows/ci.yml` (design, решение 11); проверить: `yarn format:check` проходит, команда совпадает со скриптом в корневом `package.json`
- [x] 5.2 Обновить `AGENTS.md`: команды `yarn dev` и `yarn build`, список «Решено, но пока не установлено» (убрать React Testing Library), «перед готово» добавить `yarn build`; проверить: команды в `AGENTS.md` совпадают со скриптами корня
- [x] 5.3 Обновить `frontend/AGENTS.md`: что установлено (Zustand ещё нет), алиас `@/`, shadcn на Base UI и как добавлять компоненты (`yarn dlx shadcn@4.23.0 add ...`), тесты — Vitest + RTL на jsdom; правил структуры `src/` не писать, кроме двух принятых позже (задача 5.6) (design, решение 12); проверить: в файле нет «пока не установлено» про то, что уже стоит
- [x] 5.4 Обновить `docs/architecture.md`: раздел CI (шаг `build`, «позже» без `build`), раздел «Тесты» и что стоит во `frontend/`; проверить: раздел CI описывает те же шаги, что `ci.yml`
- [x] 5.5 Обновить `frontend/AGENTS.md` после задач 1.5–1.7, 3.3, 4.2: три tsconfig и где какие типы, `RouterProvider` из `react-router/dom`, страницы в своих файлах (Fast Refresh), очистка DOM в setup-файле тестов; в `docs/architecture.md` — строка про `frontend/` в структуре, если нужно; проверить: описание совпадает с файлами
- [x] 5.6 Записать в `frontend/AGENTS.md` правила структуры `src/`: страницы в `src/pages/`, имена файлов в kebab-case (design, решение 12); и как получить контекст shadcn в монорепо: `yarn dlx shadcn@4.23.0 info` из `frontend/` (из корня CLI отвечает `monorepo_root`, авто-контекст скилла `shadcn` из корня не работает); проверить: правила совпадают с design, команда `info` из `frontend/` выводит алиасы

## 6. Проверка локально

- [x] 6.1 Прогнать `yarn lint`, `yarn format:check`, `yarn deps`, `yarn typecheck`, `yarn test`, `yarn build` и `yarn openspec validate setup-frontend-scaffold`; проверить: всё без ошибок

## 7. Проверка на GitHub (человек)

- [x] 7.1 Человек пушит ветку и открывает PR; проверить: `CI / check` зелёная, в логе есть шаг `yarn build`, `yarn test` запускает тест фронта

## Workflow follow-up

- После ревью и зелёного CI, перед слиянием: `/opsx:archive setup-frontend-scaffold` в этой же ветке; человек коммитит архив последним коммитом и сливает PR.
