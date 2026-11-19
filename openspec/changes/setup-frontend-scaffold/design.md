# Design

## Context

`frontend/package.json` пустой (`name`, `private`, `type: module`). В корне: TypeScript 7.0.2 (только TS 7), Oxlint с плагинами `typescript` и `import`, oxfmt, knip (`--include unlisted,unresolved`), Turborepo с задачами `typecheck` и `test`. В `shared/` уже стоят `vite@^8.3.8` и `vitest@^5.1.1`. `tsconfig.base.json`: `module: preserve`, `moduleResolution: bundler`, `strict`, `noEmit`, `verbatimModuleSyntax`. CI: одна задача `check`, сборки нет.

Версии на 19.11.2026 19:54 UTC по [реестру npm](https://registry.npmjs.org/) (`dist-tags`, `time`, `engines`, `peerDependencies`). У Yarn карантин `npmMinimalAgeGate` 1440 мин: ставится последняя версия старше суток. Правило для задачи 1.1: берём последнюю версию, разрешённую карантином в момент установки, и записываем её сюда.

| Пакет | Версия | Примечание |
|---|---|---|
| react, react-dom | 19.3.1 | |
| @types/react, @types/react-dom | 19.3.0 | |
| react-router | 8.5.2 | вышла 18.11.2026; требует Node ≥ 22.22.0, React ≥ 19.2.7 |
| @tanstack/react-query | 5.108.0 → 5.108.1 | 5.108.1 на карантине до 20.11.2026 14:03 UTC |
| vite | 8.3.8 | та же, что в `shared/` |
| @vitejs/plugin-react | 6.3.0 | peer `vite ^8` |
| tailwindcss, @tailwindcss/vite | 4.3.5 | |
| shadcn (CLI) | 4.23.0 | запуск через `yarn dlx`, в зависимости не попадает |
| vitest | 5.1.1 | та же, что в `shared/` |
| @testing-library/react | 16.3.3 | |
| @testing-library/dom | 10.4.2 | peer для RTL |
| @testing-library/jest-dom | 7.0.1 → 8.0.0 | 8.0.0 на карантине до 20.11.2026 03:09 UTC; мажорная версия, peer `vitest >=5 <6`, путь `/vitest` в `exports` есть |
| jsdom | 31.0.1 | требует Node `^24.15.0` для ветки 24 |
| @types/node | ^24 (сейчас 24.19.2) | для `vite.config.ts`; ветка 24 по `.nvmrc`, хотя `latest` — 26.6.6 |

Зависимости, которые добавит `shadcn init` (по [документации shadcn для Vite](https://ui.shadcn.com/docs/installation/vite)): `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`, `lucide-react` и, возможно, другие (для Base UI — пакет Base UI). Точный список фиксируем в задаче 2.2 по факту.

API сверены через Context7:
- React Router — `/remix-run/react-router` (ветка `main`, тега v8 в Context7 нет): `createBrowserRouter`, `createMemoryRouter`, `RouterProvider`, `useBlocker` экспортируются из `react-router` в v8. Гайд перехода на v8: убраны флаги `future.v8_*`, их поведение стало обычным; почти все касаются framework mode.
- Vitest — `/vitest-dev/vitest/v5.0.3` (тега 5.1.1 нет): `defineConfig` из `vitest/config`, `test.environment: 'jsdom'`, `test.setupFiles`.

## Goals / Non-Goals

**Goals:**
- `yarn dev` открывает главную страницу, `yarn build` собирает `frontend/dist`.
- Все пять проверок и `yarn build` проходят локально и в CI.
- Каркас готов к shadcn-компонентам и запросам через TanStack Query.

**Non-Goals:**
- Свои компоненты, макет, тема, тёмный режим.
- Правила структуры `src/` на будущее: папки для страниц, имена файлов, где лежат тесты (решение человека: решим вместе с первыми настоящими экранами).
- Прокси к API: появится с каркасом бэка.
- Покрытие тестами, кроме одного теста-проверки.

## Decisions

1. **Vite 8 + `@vitejs/plugin-react` 6.** Стандартный плагин; JSX преобразует Oxc без Babel. React Compiler не включаем (у плагина он опциональный peer): отдельное решение, сейчас не нужен.

2. **React Router 8, data mode** (решение человека). `createBrowserRouter` + `RouterProvider` из пакета `react-router` ([режимы](https://reactrouter.com/start/modes)). Главная причина — `useBlocker`: предупреждение о несохранённых изменениях в редакторе. Он есть только в data и framework mode ([useBlocker](https://reactrouter.com/api/hooks/useBlocker)). Загрузчики (`loader`) не используем: данные с сервера грузит TanStack Query. Framework mode не берём: это метафреймворк, ADR-0002 его исключает.
   - Маршруты — один экспортируемый массив. Тест собирает из него `createMemoryRouter`, второго описания маршрутов нет.
   - Неизвестный адрес покажет встроенную страницу ошибки React Router. Свою 404 не делаем (решение человека).

3. **TanStack Query.** Один `QueryClient` в `src/main.tsx`, `QueryClientProvider` снаружи `RouterProvider`. Настройки по умолчанию, Devtools не ставим.

4. **Tailwind CSS 4 через `@tailwindcss/vite`**, в `src/index.css` строка `@import "tailwindcss"`. Конфиг `tailwind.config.js` не нужен: в v4 настройка идёт в CSS.

5. **shadcn/ui: только `init`, основа Base UI, стиль nova** (решение человека). `yarn dlx shadcn@4.23.0 init --base base --preset nova` в `frontend/`. CLI создаёт `components.json` (`base: "base"`, `style: "nova"`), `src/lib/utils.ts` (`cn`), переменные темы в `src/index.css` и ставит свои зависимости. Компоненты (`shadcn add ...`) добавляем, когда они понадобятся. Стиль можно сменить позже командой `apply`.
   - Скилл `shadcn` в примерах пишет `npx shadcn@latest`; у нас Yarn, поэтому `yarn dlx shadcn@<версия>` с закреплённой версией.
   - **Проверка зависимости от TypeScript.** CLI зависит от `ts-morph@^26`. `@ts-morph/common` не объявляет `typescript` в зависимостях: он несёт свою копию TypeScript внутри ([npm](https://registry.npmjs.org/@ts-morph/common)). Значит, CLI не использует наш TS 7. Это вывод по списку зависимостей, а не по запуску. Окончательно проверит задача 2.2.
   - CLI не попадает в `package.json`: он нужен один раз при `init` и при `add`.

6. **Алиас `@/` → `frontend/src/`.** Его ждёт shadcn (`components.json`). Задаём в двух местах: `paths` в `frontend/tsconfig.json` и `resolve.alias` в `vite.config.ts`. `baseUrl` не ставим: в TS 7 его, вероятно, нет, а `paths` работают относительно `tsconfig.json`. Это проверит задача 1.3.

7. **TypeScript: один `frontend/tsconfig.json`** (решение человека). Наследует `tsconfig.base.json`, добавляет `jsx: react-jsx`, `lib: [ES2024, DOM, DOM.Iterable]`, `types: [vite/client, node]` и `paths`. В `include`: `src` и `vite.config.ts`. Проверка — тот же `tsc --noEmit`, что в `shared/`. `@types/node` нужен для `vite.config.ts` (`node:url`). Типы Node будут видны и в `src/`; импорт `node:*` в браузерный код ловит ревью (см. риски).

8. **Тесты.** Конфиг Vitest в `vite.config.ts` (`defineConfig` из `vitest/config`): `environment: 'jsdom'`, `setupFiles` с одним файлом, где `import '@testing-library/jest-dom/vitest'`. Один тест: `createMemoryRouter` из массива маршрутов → на экране заголовок главной. `@testing-library/user-event` не ставим: пока нет взаимодействий.
   - Скилл `tdd`: граница теста (seam) — массив маршрутов, отрисованный через роутер; тест смотрит только на то, что видит пользователь (заголовок), не на внутренности. Цикл red → green: тест сначала падает (заголовка нет), потом проходит.

9. **Oxlint.** В `.oxlintrc.json` плагины `react` и `jsx-a11y`. Отдельного плагина `react-hooks` в Oxlint нет: правила `rules-of-hooks` и `exhaustive-deps` входят в плагин `react`. Задача 4.1 проверит это по `oxlint --rules`. Категория `correctness` уже включена. Для `frontend/**` добавляем `override` с `env.browser`.

10. **Скрипты и Turborepo.**
    - `frontend/package.json`: `dev` (`vite`), `build` (`vite build`), `preview` (`vite preview`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`).
    - Корень: `build` → `turbo run build`, `dev` → `turbo run dev`.
    - `turbo.json`: `build` с `outputs: ["dist/**"]`; `dev` с `cache: false, persistent: true`.
    - `build` не зависит от `typecheck` (решение человека): в CI обе задачи идут отдельными шагами.

11. **CI.** В `ci.yml` шаг `yarn build` после `yarn test`. Кэш Turborepo в CI не настраиваем (как и раньше).

12. **Файлы каркаса — только нужные для работы** (решение человека: минимум). Корень `frontend/`: `index.html` (`lang="ru"`, `<title>Writechart</title>`), `vite.config.ts`, `tsconfig.json`, `components.json`. В `src/`: `main.tsx`, `index.css`, `lib/utils.ts` (создаёт shadcn), модуль с массивом маршрутов и заглушкой главной, setup-файл тестов и один тест. Имена и раскладку этих файлов выбирает реализация; правилом на будущее они не становятся.

13. **Скиллы проекта при реализации.**
    - `shadcn` — задача 2.2 (`init`, проверка `components.json`).
    - `tdd` — задача 3.2 (seam и цикл red → green, решение 8).
    - `vercel-react-best-practices` — код в задачах 1.2 и 3.2; на заглушке почти не применяется, но заглушка не должна ему противоречить.
    - `vercel-composition-patterns` — здесь не нужен: своих компонентов нет. Пригодится с первыми компонентами.

## Risks / Trade-offs

- [React Router 8 вышел 18.11.2026] → в нём могут быть ошибки. Гайд перехода и экспорты v8 сверены через Context7 (ветка `main`, не тег). Смягчение: используем базовые API data mode. Если что-то сломается, можно откатиться на 7.18.6 (у неё те же API data mode).
- [`@testing-library/jest-dom` 8 — мажорная версия] → список несовместимостей не прочитан. Смягчение: используем только `import '@testing-library/jest-dom/vitest'` и `toBeInTheDocument`; путь `/vitest` в 8.0.0 есть. Если тест не соберётся — откат на 7.0.1 и запись в design.
- [shadcn CLI и TS 7] → CLI читает `tsconfig.json` (через `tsconfig-paths`) и может не понять настройку без `baseUrl`. Смягчение: если `init` упадёт, пишем `components.json` и `utils.ts` вручную по документации shadcn. Это фиксируем в задаче 2.2.
- [shadcn CLI в монорепо] → CLI может принять корень Yarn-воркспейсов за монорепо и спросить, куда ставить. Смягчение: запуск из `frontend/`; если CLI спросит — ставим в `frontend/` и записываем флаг в design.
- [`@types/node` в `frontend/`] → типы Node видны и в `src/`. Смягчение: в `src/` нет импортов `node:*`, проверка — `grep` в задаче 4.1. Разделить на два tsconfig можно позже, если это станет проблемой.
- [jsdom 31 требует Node ≥ 24.15] → локально стоит 24.22, в CI `.nvmrc` = `24` даёт последнюю 24.x. Смягчение: проверит первый запуск CI.
- [Время CI] → шаг сборки добавит время. Сколько — станет видно по первому запуску.
- [knip и конфиги Vite] → knip может не увидеть плагины из `vite.config.ts` или setup-файл. Смягчение: задача 6.1 запускает `yarn deps`. Если knip ошибается, правим его конфиг, а проверку не отключаем.

## Open Questions

Нет.
