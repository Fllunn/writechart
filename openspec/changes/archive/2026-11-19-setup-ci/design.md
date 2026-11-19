# Design

## Context

После `setup-dev-tooling` в корне есть скрипты `lint` (Oxlint), `format:check` (oxfmt), `deps` (knip), `typecheck` и `test` (через Turborepo). Yarn 4.18.1 закреплён в `packageManager` и включается Corepack; Node — `.nvmrc` (`24`). В `.github/` только шаблон PR. Репозиторий на GitHub, процесс — GitHub Flow, слияние кнопкой в режиме merge commit (ADR-0010).

Версии действий на 19.11.2026 (GitHub API, `releases/latest`):

| Действие | Последний релиз |
|---|---|
| actions/checkout | v7.0.1 (20.07.2026) |
| actions/setup-node | v7.1.0 (08.10.2026) |

Документация setup-node ([advanced-usage.md](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md#caching-packages-data)): `cache: 'yarn'` поддерживает Yarn Berry (v2+) и кэширует глобальный кэш Yarn, а не `node_modules`.

## Goals / Non-Goals

**Goals:**
- Каждый PR в `master` проверяется теми же пятью командами, что и локально.
- `master` перепроверяется после каждого слияния.
- Порядок архивации OpenSpec: один PR на изменение.

**Non-Goals:**
- PostgreSQL, `build`, Playwright, удалённый кэш Turborepo, деплой.
- Настройка защиты ветки из кода (это настройки GitHub, их делает человек).

## Decisions

1. **Один файл, одна задача** `check` в workflow `CI`. Все проверки подряд после одной установки зависимостей. Параллельные задачи не нужны: кода мало, а установка повторялась бы в каждой.
2. **Триггеры:** `pull_request` в `master` и `push` в `master`. Push в `master` у нас бывает только при слиянии PR.
3. **Отмена устаревших запусков:** `concurrency` по ветке с `cancel-in-progress: true` — новый коммит в PR останавливает прошлый запуск той же ветки.
4. **Права:** `permissions: contents: read` — workflow только читает код.
5. **Шаги:**
   1. `actions/checkout@v7`;
   2. `corepack enable` — до setup-node, чтобы `cache: 'yarn'` вызвал Yarn 4 из `packageManager`, а не Yarn 1;
   3. `actions/setup-node@v7` с `node-version-file: .nvmrc` и `cache: yarn`;
   4. `yarn install --immutable` — падает, если `yarn.lock` не совпадает с `package.json`;
   5. `yarn lint`, `yarn format:check`, `yarn deps`, `yarn typecheck`, `yarn test` — отдельными шагами, чтобы в логе было видно, какой упал.
6. **Порядок проверок:** сначала быстрые (lint, format, deps), потом typecheck и test.
7. **Архивация в той же ветке:** шаг 5 в `AGENTS.md` меняется на «перед слиянием, последним коммитом в ветке изменения: `/opsx:archive`». Это решение человека; `setup-ci` архивируется уже по новому порядку.
8. **Защита ветки** — шаг для человека: в GitHub, Settings → Rules (или Branches) для `master` — запрет прямого push, обязательная проверка `check` из workflow `CI` и галочка «Require branches to be up to date before merging». Имя проверки появляется в списке только после первого запуска, поэтому сначала нужен PR с зелёным CI.
9. **Ветка должна быть актуальной перед слиянием** (решение человека). CI в PR проверяет слияние с тем `master`, который был при запуске, и не перезапускается, когда `master` меняется ([события GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)). Без этой галочки два зелёных PR вместе могут сломать `master`. С ней GitHub не даёт слить отставшую ветку, пока её не обновят («Update branch») и CI не пройдёт заново ([защищённые ветки](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)).
10. **Зачем запуск на push в `master`** при этой галочке: кэш. Кэш из PR доступен только этому PR, а кэш из `master` — всем PR ([кэш зависимостей](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)).

## Risks / Trade-offs

- [`corepack enable` до setup-node] → Corepack берётся из Node, который уже стоит на раннере. Если его версия не знает Yarn 4.18.1, шаг кэша упадёт. Смягчение: проверяется первым запуском на PR (задача 4.1); запасной вариант — перенести `corepack enable` после setup-node и кэшировать через `actions/cache`.
- [Бинарники Oxlint и oxfmt под Linux] → локально ставились бинарники для Windows. Yarn ставит нужные под платформу из `yarn.lock`. Смягчение: проверяется первым запуском на PR.
- [Oxlint и `.gitignore`] → на раннере репозиторий — корень git, проблемы с чужим `.gitignore` нет; в логе `yarn lint` проверить, что файлы найдены.
- [Архив до слияния] → если на ревью попросят доработку после архивации, файлы изменения придётся править в `archive/`. Смягчение: архивировать последним шагом, когда ревью пройдено.

## Open Questions

Нет.
