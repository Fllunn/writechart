# Design

## Context

После `setup-repo-structure` пакеты `frontend/`, `backend/`, `shared/` пустые: только `package.json` и `AGENTS.md`, в `shared/src/` файлов нет. В корне из devDependencies только OpenSpec. Yarn 4.18.1, `nodeLinker: node-modules`, Node 24.

ADR-0009 выбрал ESLint + Prettier. Команда выбрала TypeScript 7, а typescript-eslint 8.73.0 требует `typescript <6.1.0` и при TS 7 падает с ошибкой «typescript-eslint does not support TS 7.0» (проверено на тестовом проекте 19.11.2026). Поэтому линтер и форматтер меняются.

Версии на 19.11.2026 (тег `latest`, `https://registry.npmjs.org/<пакет>/latest`):

| Пакет | latest | Примечание |
|---|---|---|
| turbo | 2.11.13 | |
| typescript | 7.0.2 | вышла 08.07.2026, нативный компилятор на Go |
| oxlint | 1.94.0 | 1.0.0 вышла 10.06.2025 |
| oxlint-tsgolint | 7.0.2007 | проверки по типам через TS 7 |
| oxfmt | 0.79.0 | первая версия 10.09.2025, до 1.0 |
| knip | 6.46.1 | не зависит от пакета `typescript`; установлена 6.46.0: 6.46.1 младше суток, Yarn держит её на карантине (`npmMinimalAgeGate` = 1440 мин) |
| vitest | 5.1.1 | engines: `node ^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` |

Проверено на тестовом проекте (TS 7.0.2, oxlint 1.94.0, oxlint-tsgolint 7.0.2007, knip 6.46.1, oxfmt 0.79.0): `tsc` проходит; `oxlint --type-aware` ловит забытый `await` (`typescript(no-floating-promises)`); `knip --strict` ловит импорт необъявленного пакета; `oxfmt --check` работает.

## Goals / Non-Goals

**Goals:**
- `yarn lint`, `yarn typecheck`, `yarn test`, `yarn format:check`, `yarn deps` работают из корня и проходят.
- Только TS 7, без второй версии TypeScript в проекте.
- Новый пакет подключается добавлением скриптов и `tsconfig.json`, без правки корня.

**Non-Goals:**
- CI, каркасы фронта и бэка, RTL, Supertest, Playwright, база в тестах.
- Задача `build` и настройки TypeScript под Vite и под запуск Node — их задаст изменение с каркасами.
- Правила React в Oxlint (`react/rules-of-hooks`, `react/exhaustive-deps`, `react/only-export-components`) — с каркасом фронта.
- Pre-commit хуки (не решены в ADR).

## Decisions

1. **Turborepo** — задачи `typecheck` и `test` по пакетам, `outputs: []`. Корневые скрипты `typecheck` и `test` вызывают `turbo run <задача>`. `.turbo/` уже в `.gitignore`.
2. **TypeScript 7.0.x** (`typescript@~7.0.2`) только в `shared/` (и позже в каждом пакете со своим `typecheck`). В корне пакет `typescript` не нужен: Oxlint и knip его не используют.
3. **`tsconfig.base.json`** в корне: `strict`, `noEmit`, `isolatedModules`, `verbatimModuleSyntax`, `skipLibCheck`, `module: preserve`, `moduleResolution: bundler`, `target: ES2024`. Без опций, которые TS 7 удалил (`baseUrl`, `moduleResolution: node`, `target: es5` и др.). Пакеты наследуют базу через `extends`.
4. **Oxlint из корня, не через turbo.** Один запуск `oxlint --type-aware --deny-warnings` на весь репозиторий: Oxlint сам находит ближайший `tsconfig.json` для каждого файла и работает быстрее одного процесса на пакет. Конфиг `.oxlintrc.json`: плагины `typescript`, `import`; категория `correctness` — ошибки; правила по типам из `oxlint-tsgolint` включены.
5. **oxfmt вместо Prettier**, из корня: `oxfmt` (запись) и `oxfmt --check`. Конфиг `.oxfmtrc.json` с настройками по умолчанию; oxfmt сам читает `.gitignore`, а лишнее исключено полем `ignorePatterns` в том же конфиге (`yarn.lock`, `.yarn/`, `openspec/`, `.claude/`, `.agents/`, `**/*.md`) — отдельный файл игнора не нужен. oxfmt сортирует ключи в `package.json`.
6. **knip для необъявленных зависимостей** (замена строгости PnP из ADR-0005, вместо `import/no-extraneous-dependencies`). Скрипт `yarn deps` = `knip --strict --include unlisted,unresolved`: только ошибки импорта, без отчёта о неиспользуемом коде. Проверено на тестовом проекте (knip 6.46.1):
   - без `--strict` knip засчитывает пакету зависимости корня и импорт пакета, объявленного только в корне, не ловит;
   - с `--strict` ловит и импорт пакета из корня, и импорт пакета из devDependencies в рабочем коде;
   - тестовые файлы (`*.test.ts`) с `--strict` не проверяются: их распознаёт плагин Vitest в knip, когда `vitest` объявлен в пакете. Импорт `vitest` в тесте ошибки не даёт.
   Опции `isolateWorkspaces` в knip 6 нет (`Invalid input (unrecognized_keys: isolateWorkspaces)`), отдельный `knip.json` пока не нужен.
7. **Где ставить зависимости** (правило AGENTS.md: в пакете, где используется). Yarn 4 в скрипте пакета видит только бинарники зависимостей этого пакета, поэтому:
   - корень: `turbo`, `oxlint`, `oxlint-tsgolint`, `oxfmt`, `knip`;
   - `shared/`: `typescript`, `vitest`, `vite` (Vitest 5.1.1 требует `vite` как обязательную peer-зависимость `^6.4.0 || ^7.0.0 || ^8.0.0` и сам его не ставит; добавлено при реализации с согласия человека).
8. **Vitest в `shared/`** без отдельного конфига. Один тест-проверка `shared/src/toolchain.test.ts`: без него `tsc` падает с TS18003 (нет входных файлов), а `vitest run` — «No test files found».
9. **ADR-0012** по формату проекта (Контекст → Решение → Варианты → Последствия): TS 7 + Oxlint + oxfmt + knip; в «Вариантах» — ESLint с TS 6, связка TS 6 + 7, Biome, Prettier. ADR-0009 не переписывается (правило `docs/adr/README.md`), в README его статус: «частично заменён ADR-0012».

## Risks / Trade-offs

- [Oxlint игнорирует файлы по `.gitignore` верхних git-репозиториев] → в тесте внутри чужого git-репозитория Oxlint писал «No files found to lint». В нашем репо это не мешает, но так выглядит ошибка, если путь попадёт под игнор. Смягчение: в итоговой проверке убедиться, что `yarn lint` реально проверяет `shared/src`.
- [oxfmt до версии 1.0] → возможны изменения форматирования между версиями. Смягчение: закрепить точную версию (`0.79.0`, без `^`); обновлять отдельным PR с `yarn format`.
- [Проверки по типам в Oxlint новые] → `oxlint-tsgolint` под TS 7 с 21.07.2026; по документации Oxc покрыто 60 из 62 правил typescript-eslint. Смягчение: при ложных срабатываниях отключать правило в `.oxlintrc.json` с комментарием.
- [knip `--strict` не проверяет тестовые файлы] → импорт необъявленного пакета в `*.test.ts` не будет пойман knip; упадёт сам тест, если пакета нет в `node_modules`, но при поднятом из корня пакете тест пройдёт. Смягчение: принять; ловится главное — рабочий код.
- [Защита Yarn от свежих версий] → в прошлом изменении Yarn поставил не самую свежую версию OpenSpec. Смягчение: записать фактические версии из `yarn.lock` в итог.
- [Тест-заглушка в `shared/`] → код без пользы для продукта. Смягчение: удалить, когда в `shared/` появится первая настоящая схема с тестом.

## Open Questions

- Проверять ли oxfmt `*.md`? Если да, он один раз переформатирует все документы. Сейчас — нет.
- Нужен ли `.vscode/extensions.json` с расширением Oxc (в `.gitignore` для него уже есть исключение)?
