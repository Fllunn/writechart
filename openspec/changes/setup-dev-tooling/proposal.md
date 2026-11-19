# Proposal

## Why

Инструменты разработки решены в ADR-0005 и ADR-0009, но не установлены. Без них нечего запускать в CI (следующее изменение `setup-ci`), а агентам нечем быстро проверить свой код: нет линтера, форматтера, проверки типов и тестов.

Команда выбрала TypeScript 7 (компилятор на Go, в 8–12 раз быстрее на полной сборке по данным Microsoft). typescript-eslint его не поддерживает, поэтому ESLint + Prettier из ADR-0009 заменяются инструментами Oxc: Oxlint и oxfmt. Проверку импорта необъявленных пакетов (ADR-0005) берёт knip.

## What Changes

- **Turborepo** в корне: `turbo.json` с задачами `typecheck`, `test`; корневые скрипты вызывают `turbo run …`.
- **TypeScript 7**: общий `tsconfig.base.json` в корне, `tsconfig.json` в `shared/`. Проверка типов — `tsc --noEmit`.
- **Oxlint** + `oxlint-tsgolint` в корне: правила JS, TypeScript и проверки по типам через TS 7 (например, забытый `await`). Скрипт `yarn lint`.
- **oxfmt** в корне: форматтер вместо Prettier. Скрипты `yarn format` и `yarn format:check`.
- **knip** в корне: запрет импорта пакетов, не объявленных в `package.json` своего пакета. Скрипт `yarn deps`.
- **Vitest** в `shared/`: скрипт `test`, один тест-проверка, что связка работает.
- Скрипты `typecheck` и `test` пока только в `shared/`: в `frontend/` и `backend/` нет кода, им скрипты добавит изменение с каркасами.
- **ADR-0012** «TypeScript 7, Oxlint, oxfmt и knip вместо ESLint и Prettier» со ссылкой на ADR-0009; обновить `docs/adr/README.md`, `docs/architecture.md`, `AGENTS.md`.

Вне рамок: CI (`setup-ci`), каркасы фронта и бэка, React Testing Library, Supertest, Playwright, PostgreSQL в тестах, pre-commit хуки, задача `build` (собирать пока нечего: `shared` без сборки, ADR-0007), правила React в Oxlint (добавит изменение с каркасом фронта).

## Capabilities

### New Capabilities

Нет. Меняются только инструменты, поведение системы не меняется, поэтому `skip_specs: true`.

### Modified Capabilities

Нет.

## Impact

- Новые файлы в корне: `turbo.json`, `tsconfig.base.json`, `.oxlintrc.json`, `.oxfmtrc.json`; в `shared/`: `tsconfig.json`, тест; в `docs/adr/`: `0012-…md`.
- Новые devDependencies в корневом `package.json` и в `shared/package.json`, обновится `yarn.lock`.
- `yarn lint`, `yarn typecheck`, `yarn test`, `yarn format:check`, `yarn deps` проходят на чистом репозитории.
- ADR-0009 в части линтера и форматтера заменяется ADR-0012; Vitest, RTL, Supertest, Playwright остаются.
