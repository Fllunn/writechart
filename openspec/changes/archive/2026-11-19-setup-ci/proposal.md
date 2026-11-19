# Proposal

## Why

Проверки (`yarn lint`, `yarn typecheck`, `yarn test`, `yarn format:check`, `yarn deps`) есть, но запускаются только руками. По процессу (ADR-0010) PR сливается только при зелёном CI, а CI нет. Курс тоже требует автотесты в CI (ADR-0009).

Заодно меняется порядок архивации OpenSpec: сейчас архив идёт отдельным PR после слияния, и на каждое изменение уходит два PR.

## What Changes

- **GitHub Actions** `.github/workflows/ci.yml`: одна задача на `ubuntu-latest`. Шаги: checkout, Corepack, Node из `.nvmrc` с кэшем Yarn, `yarn install --immutable`, затем `yarn lint`, `yarn format:check`, `yarn deps`, `yarn typecheck`, `yarn test`.
- Запуск на PR в `master` и на push в `master` (то есть после каждого слияния).
- Шаблон PR: пункт «CI зелёный» остаётся, без изменений.
- **Порядок архивации:** изменение OpenSpec архивируется в той же ветке последним коммитом перед слиянием, а не отдельным PR после. Правка в `AGENTS.md` (шаг 5 процесса) и `docs/architecture.md`.
- Обновить раздел CI в `docs/architecture.md`.
- **Шаг для человека:** после первого зелёного запуска включить в GitHub защиту `master` с обязательной проверкой CI и правилом «ветка должна быть актуальной перед слиянием» (Require branches to be up to date before merging).

Вне рамок: сервис PostgreSQL в CI (с первым тестом базы), `build` и Playwright (с каркасами), удалённый кэш Turborepo, деплой, автопроверка сообщений коммитов.

## Capabilities

### New Capabilities

Нет. Меняются инструменты и процесс, поведение системы не меняется, поэтому `skip_specs: true`.

### Modified Capabilities

Нет.

## Impact

- Новый файл `.github/workflows/ci.yml`.
- Правки в `AGENTS.md` и `docs/architecture.md`.
- Каждый PR в `master` и каждое слияние запускают CI на GitHub Actions. Для публичного репозитория стандартные раннеры бесплатны (оценка, по тарифам GitHub не проверял).
- Зависимости не добавляются.
