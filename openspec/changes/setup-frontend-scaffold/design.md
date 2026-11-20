# Design

## Context

`frontend/package.json` пустой (`name`, `private`, `type: module`). В корне: TypeScript 7.0.2 (только TS 7), Oxlint с плагинами `typescript` и `import`, oxfmt, knip (`--include unlisted,unresolved`), Turborepo с задачами `typecheck` и `test`. В `shared/` уже стоят `vite@^8.3.8` и `vitest@^5.1.1`. `tsconfig.base.json`: `module: preserve`, `moduleResolution: bundler`, `strict`, `noEmit`, `verbatimModuleSyntax`. CI: одна задача `check`, сборки нет.

Версии на 19.11.2026 19:54 UTC по [реестру npm](https://registry.npmjs.org/) (`dist-tags`, `time`, `engines`, `peerDependencies`). У Yarn карантин `npmMinimalAgeGate` 1440 мин: ставится последняя версия старше суток. Правило для задачи 1.1: берём последнюю версию, разрешённую карантином в момент установки, и записываем её сюда.

| Пакет | Версия | Примечание |
|---|---|---|
| react, react-dom | 19.3.1 | |
| @types/react, @types/react-dom | 19.3.0 | |
| react-router | 8.5.2 | вышла 18.11.2026; требует Node ≥ 22.22.0, React ≥ 19.2.7 |
| @tanstack/react-query | 5.108.0 | 5.108.1 на карантине до 20.11.2026 14:03 UTC; при установке 20.11.2026 ещё на карантине, стоит 5.108.0 |
| vite | 8.3.8 | та же, что в `shared/` |
| @vitejs/plugin-react | 6.3.0 | peer `vite ^8` |
| tailwindcss, @tailwindcss/vite | 4.3.5 | |
| shadcn | 4.23.0 | CLI запускаем через `yarn dlx`; сам пакет стоит в `dependencies` ради `shadcn/tailwind.css` (решение 5) |
| typescript | ~7.0.2 | та же, что в `shared/` |
| vitest | 5.1.1 | та же, что в `shared/` |
| @testing-library/react | 16.3.3 | |
| @testing-library/dom | 10.4.2 | peer для RTL |
| @testing-library/jest-dom | 8.0.0 | при установке 20.11.2026 карантин уже прошёл; мажорная версия, peer `vitest >=5 <6`, путь `/vitest` в `exports` есть |
| jsdom | 31.0.1 | требует Node `^24.15.0` для ветки 24 |
| @types/node | ^24 (сейчас 24.19.2) | для `vite.config.ts`; ветка 24 по `.nvmrc`, хотя `latest` — 26.6.6 |

Зависимости, которые добавил `shadcn init` 4.23.0 (задача 2.2, по факту), все в `dependencies`:

| Пакет | Версия | Зачем |
|---|---|---|
| shadcn | 4.23.0 | `@import "shadcn/tailwind.css"` в `index.css` |
| @base-ui/react | 1.9.0 | основа компонентов (Base UI) |
| cn | 0.5.2 | функция `cn` в `src/lib/utils.ts`; пакет shadcn-ui, заменяет `clsx` + `tailwind-merge` |
| class-variance-authority | 0.7.1 | варианты компонентов |
| lucide-react | 1.76.0 | иконки (`iconLibrary: "lucide"`) |
| tw-animate-css | 1.4.0 | анимации |
| @fontsource-variable/geist | 5.3.0 | шрифт Geist пресета nova |

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
- Остальные правила структуры `src/`: где лежат тесты, папки для компонентов и хуков сверх тех, что задаёт shadcn (решение человека: решим вместе с первыми настоящими экранами). Два правила приняты сразу: страницы в `src/pages/` и имена файлов в kebab-case (решение 12).
- Прокси к API: появится с каркасом бэка.
- Покрытие тестами, кроме одного теста-проверки.

## Decisions

1. **Vite 8 + `@vitejs/plugin-react` 6.** Стандартный плагин; JSX преобразует Oxc без Babel. React Compiler не включаем (у плагина он опциональный peer): отдельное решение, сейчас не нужен.

2. **React Router 8, data mode** (решение человека). `createBrowserRouter` из `react-router`, `RouterProvider` из `react-router/dom` ([режимы](https://reactrouter.com/start/modes)). По [документации `RouterProvider`](https://reactrouter.com/api/data-routers/RouterProvider) версия из `react-router/dom` сама подключает `flushSync` из `react-dom`, её нужно брать «almost always»; версия из `react-router` — для сред без DOM (исправление после проверки по документации, решение человека). Главная причина — `useBlocker`: предупреждение о несохранённых изменениях в редакторе. Он есть только в data и framework mode ([useBlocker](https://reactrouter.com/api/hooks/useBlocker)). Загрузчики (`loader`) не используем: данные с сервера грузит TanStack Query. Framework mode не берём: это метафреймворк, ADR-0002 его исключает.
   - Маршруты — один экспортируемый массив. Тест собирает из него `createMemoryRouter`, второго описания маршрутов нет.
   - Страница лежит в своём файле (`src/pages/home-page.tsx`), модуль маршрутов только импортирует её. Если файл экспортирует не-компонент (массив `routes`) и при этом объявляет компонент, Fast Refresh не работает: любая правка перезагружает страницу целиком. Это ловит правило `react/only-export-components` (решение 9). Исправление после проверки по документации, решение человека; правила раскладки — в решении 12.
   - Неизвестный адрес покажет встроенную страницу ошибки React Router. Свою 404 не делаем (решение человека).

3. **TanStack Query.** Один `QueryClient` в `src/main.tsx`, `QueryClientProvider` снаружи `RouterProvider`. Настройки по умолчанию, Devtools не ставим.

4. **Tailwind CSS 4 через `@tailwindcss/vite`**, в `src/index.css` строка `@import "tailwindcss"`. Конфиг `tailwind.config.js` не нужен: в v4 настройка идёт в CSS.
   - `tailwindcss` и `@tailwindcss/vite` стоят в `dependencies`, как в [инструкции shadcn для Vite](https://ui.shadcn.com/docs/installation/vite) (`npm install` без `-D`). Факт из задачи 6.1: в `devDependencies` knip `--strict` считает `tailwindcss` неуказанным, потому что `src/index.css` — код для production.

5. **shadcn/ui: только `init`, основа Base UI, стиль nova** (решение человека). `yarn dlx shadcn@4.23.0 init --base base --preset nova --no-monorepo` в `frontend/` (`--no-monorepo`: CLI не спрашивает про монорепо). CLI создаёт `components.json` (`style: "base-nova"`: в 4.23 основа и стиль записаны одним полем, отдельного `base` нет), `src/lib/utils.ts` (`cn`), переменные темы в `src/index.css` и ставит свои зависимости. Компоненты (`shadcn add ...`) добавляем, когда они понадобятся. Стиль можно сменить позже командой `apply`.
   - **Пакет `shadcn` в `dependencies`** (решение человека: как в официальной документации). `init` пишет в `index.css` строку `@import "shadcn/tailwind.css"`: общие утилиты Radix и Base UI (варианты `data-open:`, `data-closed:`, анимации аккордеона). По [документации](https://ui.shadcn.com/docs/cli) это обычная зависимость, как `tw-animate-css`: CSS берётся при сборке, в бандл попадает только нужное. В [ручной установке](https://ui.shadcn.com/docs/installation/manual) пакет тоже ставят в зависимости. Отказаться можно командой `shadcn eject`, но она необратима и отключает обновления этого CSS, поэтому её не используем. Тяжёлые зависимости CLI (babel, ts-morph) лежат в `node_modules`, в бандл не попадают.
   - Скилл `shadcn` в примерах пишет `npx shadcn@latest`; у нас Yarn, поэтому `yarn dlx shadcn@<версия>` с закреплённой версией.
   - **Проверка зависимости от TypeScript.** CLI зависит от `ts-morph@^26`. `@ts-morph/common` не объявляет `typescript` в зависимостях: он несёт свою копию TypeScript внутри ([npm](https://registry.npmjs.org/@ts-morph/common)). Значит, CLI не использует наш TS 7. Задача 2.2 подтвердила: `init` прошёл без ошибок, `paths` без `baseUrl` CLI понял.
   - CLI (`init`, `add`) запускаем через `yarn dlx shadcn@4.23.0`; пакет `shadcn` в `dependencies` нужен ради CSS (пункт выше).

6. **Алиас `@/` → `frontend/src/`.** Его ждёт shadcn (`components.json`). Задаём в `paths` (корневой `frontend/tsconfig.json` для CLI shadcn и `tsconfig.app.json` для кода, как в [инструкции shadcn для Vite](https://ui.shadcn.com/docs/installation/vite)) и в `resolve.alias` в `vite.config.ts`. `resolve.tsconfigPaths` не включаем: по [документации Vite](https://vite.dev/guide/features#paths) он медленнее, а команда TypeScript не советует так использовать `paths`. `baseUrl` не ставим: в TS 7 его, вероятно, нет, а `paths` работают относительно `tsconfig.json`. Это проверит задача 1.3.

7. **TypeScript: три файла, как в шаблоне Vite `react-ts`** (решение человека после проверки по документации; сначала был один `tsconfig.json`, но тогда типы Node видны в `src/`, и `process.env` в браузерном коде проходит проверку типов).
   - `tsconfig.app.json` — код для браузера: наследует `tsconfig.base.json`, `jsx: react-jsx`, `lib: [ES2024, DOM, DOM.Iterable]`, `types: [vite/client]`, `paths`; `include: [src]`.
   - `tsconfig.node.json` — конфиг сборки: наследует `tsconfig.base.json`, `lib: [ES2024]`, `types: [node]`; `include: [vite.config.ts]`. `@types/node` нужен для `node:url`.
   - `tsconfig.json` — корень: `files: []`, `references` на оба файла и `paths` (их читает CLI shadcn).
   - Проверка — `tsc -b` (режим сборки по `references`). При `noEmit` пишутся только `.tsbuildinfo`; их путь — `node_modules/.tmp/` (`tsBuildInfoFile`), как в шаблоне Vite. Проверено на TS 7.0.2: `tsc -b` работает, `process` в `src/` даёт ошибку TS2591.

8. **Тесты.** Конфиг Vitest в `vite.config.ts` (`defineConfig` из `vitest/config`): `environment: 'jsdom'`, `setupFiles` с одним файлом, где `import '@testing-library/jest-dom/vitest'` и `afterEach(cleanup)`. `globals` не включаем (импорты явные, как в `shared/`), а без глобального `afterEach` React Testing Library не чистит DOM после теста сама ([Vitest: globals](https://vitest.dev/config/globals)): отрисованное в одном тесте осталось бы в следующем (исправление после проверки по документации, решение человека). Один тест: `createMemoryRouter` из массива маршрутов → на экране заголовок главной. `@testing-library/user-event` не ставим: пока нет взаимодействий.
   - Скилл `tdd`: граница теста (seam) — массив маршрутов, отрисованный через роутер; тест смотрит только на то, что видит пользователь (заголовок), не на внутренности. Цикл red → green: тест сначала падает (заголовка нет), потом проходит.

9. **Oxlint.** В `.oxlintrc.json` плагины `react` и `jsx-a11y`. Отдельного плагина `react-hooks` в Oxlint нет: правила `rules-of-hooks` и `exhaustive-deps` входят в плагин `react`. Задача 4.1 проверит это по `oxlint --rules`. Категория `correctness` уже включена. Для `frontend/**` добавляем `override` с `env.browser`.
   - Факт из задачи 4.1 (`oxlint --rules -f json`, Oxlint 1.94): `exhaustive-deps` в категории `correctness`, а `rules-of-hooks` — в `pedantic`. Категория `correctness` его не включает, поэтому в `rules` стоит `"react/rules-of-hooks": "error"`. Хук внутри `if` ловится. Так же правило включает шаблон Vite `react-ts`.
   - `"react/only-export-components": ["error", { "allowConstantExport": true }]` — как в шаблоне Vite `react-ts` (там `warn`; у нас `error`, потому что `yarn lint` идёт с `--deny-warnings`). Правило следит, чтобы работал Fast Refresh (решение 2). Добавлено после проверки по документации, решение человека.
   - `ignorePatterns: [".claude/", ".agents/"]`: с `jsx-a11y` Oxlint нашёл ошибки в примерах скилла `shadcn` (`assets/showcase/*.tsx`). Это чужие файлы скиллов, oxfmt их тоже не трогает.

10. **Скрипты и Turborepo.**
    - `frontend/package.json`: `dev` (`vite`), `build` (`vite build`), `preview` (`vite preview`), `typecheck` (`tsc -b`, решение 7), `test` (`vitest run`).
    - Корень: `build` → `turbo run build`, `dev` → `turbo run dev`.
    - `turbo.json`: `build` с `dependsOn: ["^build"]` и `outputs: ["dist/**"]`; `dev` с `cache: false, persistent: true` ([Turborepo](https://turborepo.com/docs/crafting-your-repository/developing-applications)).
    - `dependsOn: ["^build"]` — значение по умолчанию из [документации Turborepo](https://turborepo.com/docs/core-concepts/package-and-task-graph): сборка пакета ждёт сборки его зависимостей. Сейчас ничего не меняет: `shared/` — Just-in-Time пакет (отдаёт исходники TypeScript, своей сборки нет, [Turborepo: internal packages](https://turborepo.com/docs/core-concepts/internal-packages)). Когда у пакета появится сборка, порядок будет правильным без правки `turbo.json` (добавлено после проверки по документации, решение человека).
    - `build` не зависит от `typecheck` (решение человека): в CI обе задачи идут отдельными шагами.

11. **CI.** В `ci.yml` шаг `yarn build` после `yarn test`. Кэш Turborepo в CI не настраиваем (как и раньше).

12. **Файлы каркаса — только нужные для работы** (решение человека: минимум). Корень `frontend/`: `index.html` (`lang="ru"`, `<title>Writechart</title>`), `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `components.json`. В `src/`: `main.tsx`, `index.css`, `lib/utils.ts` (создаёт shadcn), `routes.tsx` (массив маршрутов), `pages/home-page.tsx` (заглушка главной), setup-файл тестов и один тест.
    - **Два правила структуры `src/` приняты сразу** (решение человека после второго ревью): страницы лежат в `src/pages/`, по файлу на страницу; имена файлов — kebab-case (`home-page.tsx`), как у компонентов shadcn (`components/ui/button.tsx`). Правила записаны в `frontend/AGENTS.md`. Остальная раскладка (где тесты, папки сверх тех, что задаёт `components.json`) правилом не становится и решается с первыми экранами.

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
- [`@types/node` в `frontend/`] → снято разделением tsconfig (решение 7): типы Node видны только в `vite.config.ts`.
- [CLI shadcn и `references`] → CLI читает корневой `tsconfig.json`, где теперь `files: []` и `references`. Смягчение: `paths` продублированы в корне, как велит инструкция shadcn для Vite; задача 1.6 проверяет `shadcn info`.
- [jsdom 31 требует Node ≥ 24.15] → локально стоит 24.22, в CI `.nvmrc` = `24` даёт последнюю 24.x. Смягчение: проверит первый запуск CI.
- [Время CI] → шаг сборки добавит время. Сколько — станет видно по первому запуску.
- [knip и конфиги Vite] → knip может не увидеть плагины из `vite.config.ts` или setup-файл. Смягчение: задача 6.1 запускает `yarn deps`. Если knip ошибается, правим его конфиг, а проверку не отключаем.

## Open Questions

Нет.
