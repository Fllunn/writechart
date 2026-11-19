# Tasks

## 1. Vite, React, роутер, Query

- [ ] 1.1 Поставить в `frontend/` зависимости `react`, `react-dom`, `react-router`, `@tanstack/react-query` и dev-зависимости `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `@types/node` (версии из таблицы в design; на карантине — последняя разрешённая, отметить в design); проверить: `yarn install` без ошибок, версии в `frontend/package.json` совпадают с design
- [ ] 1.2 Создать `index.html`, `vite.config.ts` (плагин React, алиас `@`), `src/main.tsx` (`QueryClientProvider` + `RouterProvider` с `createBrowserRouter`) и модуль с экспортируемым массивом маршрутов и заглушкой главной (design, решения 1–3, 6, 12; скилл `vercel-react-best-practices`); проверить: `yarn workspace @writechart/frontend dev` открывает `/` с заголовком главной
- [ ] 1.3 Создать `frontend/tsconfig.json` (design, решение 7) и скрипты `dev`, `build`, `preview`, `typecheck`, `test` в `frontend/package.json`; проверить: `yarn typecheck` проходит, импорт через `@/` проходит проверку типов без `baseUrl`
- [ ] 1.4 Добавить в корень скрипты `build` и `dev`, в `turbo.json` задачи `build` и `dev` (design, решение 10); проверить: `yarn build` создаёт `frontend/dist/index.html`

## 2. Tailwind CSS и shadcn/ui

- [ ] 2.1 Поставить `tailwindcss` и `@tailwindcss/vite`, подключить плагин в `vite.config.ts`, создать `src/index.css` с `@import "tailwindcss"` и импортировать его в `main.tsx`; проверить: класс Tailwind на главной меняет вид в `yarn dev`, после `yarn build` в `dist/assets/*.css` есть этот класс
- [ ] 2.2 Запустить `yarn dlx shadcn@4.23.0 init --base base --preset nova` в `frontend/` (design, решение 5; скилл `shadcn`); если упадёт — создать `components.json` и `src/lib/utils.ts` вручную по документации shadcn для Vite и записать причину в design; проверить: есть `components.json` с алиасом `@/`, `base: "base"`, `style: "nova"`, `src/lib/utils.ts`, переменные темы в `index.css`; список добавленных зависимостей записан в design; `yarn build` проходит

## 3. Тесты

- [ ] 3.1 Поставить `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`; добавить блок `test` в `vite.config.ts` и setup-файл с `import '@testing-library/jest-dom/vitest'` (design, решение 8); проверить: `yarn workspace @writechart/frontend test` запускается
- [ ] 3.2 Написать тест: `createMemoryRouter` из того же массива маршрутов, на экране заголовок главной (design, решение 8; скилл `tdd`); проверить: тест проходит, а если поменять текст заголовка — падает

## 4. Oxlint

- [ ] 4.1 Добавить в `.oxlintrc.json` плагины `react`, `jsx-a11y` и override `env.browser` для `frontend/**` (design, решение 9); проверить: `oxlint --rules` показывает `rules-of-hooks` и `exhaustive-deps` в плагине `react`; `yarn lint` проходит; намеренная ошибка (хук внутри `if`) ловится; в `frontend/src` нет импортов `node:*`

## 5. CI и документация

- [ ] 5.1 Добавить шаг `yarn build` после `yarn test` в `.github/workflows/ci.yml` (design, решение 11); проверить: `yarn format:check` проходит, команда совпадает со скриптом в корневом `package.json`
- [ ] 5.2 Обновить `AGENTS.md`: команды `yarn dev` и `yarn build`, список «Решено, но пока не установлено» (убрать React Testing Library), «перед готово» добавить `yarn build`; проверить: команды в `AGENTS.md` совпадают со скриптами корня
- [ ] 5.3 Обновить `frontend/AGENTS.md`: что установлено (Zustand ещё нет), алиас `@/`, shadcn на Base UI и как добавлять компоненты (`yarn dlx shadcn@4.23.0 add ...`), тесты — Vitest + RTL на jsdom; правил структуры `src/` не писать (design, решение 12); проверить: в файле нет «пока не установлено» про то, что уже стоит
- [ ] 5.4 Обновить `docs/architecture.md`: раздел CI (шаг `build`, «позже» без `build`), раздел «Тесты» и что стоит во `frontend/`; проверить: раздел CI описывает те же шаги, что `ci.yml`

## 6. Проверка локально

- [ ] 6.1 Прогнать `yarn lint`, `yarn format:check`, `yarn deps`, `yarn typecheck`, `yarn test`, `yarn build` и `yarn openspec validate setup-frontend-scaffold`; проверить: всё без ошибок

## 7. Проверка на GitHub (человек)

- [ ] 7.1 Человек пушит ветку и открывает PR; проверить: `CI / check` зелёная, в логе есть шаг `yarn build`, `yarn test` запускает тест фронта

## Workflow follow-up

- После ревью и зелёного CI, перед слиянием: `/opsx:archive setup-frontend-scaffold` в этой же ветке; человек коммитит архив последним коммитом и сливает PR.
