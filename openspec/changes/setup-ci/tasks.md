# Tasks

## 1. Workflow

- [x] 1.1 Создать `.github/workflows/ci.yml` (design, решения 1–6): workflow `CI`, задача `check`, триггеры `pull_request` и `push` в `master`, `concurrency`, `permissions: contents: read`, шаги checkout → `corepack enable` → setup-node (`.nvmrc`, `cache: yarn`) → `yarn install --immutable` → `lint`, `format:check`, `deps`, `typecheck`, `test`; проверить: `yarn format:check` проходит (oxfmt проверяет YAML), команды в файле совпадают со скриптами корневого `package.json`

## 2. Процесс

- [x] 2.1 Обновить шаг 5 «Как работаем» в `AGENTS.md`: архивация в той же ветке последним коммитом перед слиянием (design, решение 7); проверить: в `AGENTS.md` нет фразы «После слияния PR: `/opsx:archive`»
- [x] 2.2 Обновить `docs/architecture.md`: раздел «CI/CD» (что запускается сейчас, что позже), процесс OpenSpec (архив до слияния), структура репо (`.github/workflows/ci.yml`); проверить: раздел CI описывает тот же набор команд, что `ci.yml`

## 3. Проверка локально

- [x] 3.1 Прогнать `yarn lint`, `yarn format:check`, `yarn deps`, `yarn typecheck`, `yarn test` и `yarn openspec validate setup-ci`; проверить: всё без ошибок

## 4. Проверка на GitHub (человек)

- [ ] 4.1 Человек пушит ветку и открывает PR; проверить: задача `CI / check` зелёная, в логе `yarn lint` видно, что проверены файлы
- [ ] 4.2 Человек включает защиту `master`: запрет прямого push, обязательная проверка `check`, «Require branches to be up to date before merging» (design, решения 8–9); проверить: в PR видно, что `check` обязательна

## 5. Архив

- [ ] 5.1 После ревью и зелёного CI, перед слиянием: `/opsx:archive setup-ci` в этой же ветке; человек коммитит архив и сливает PR

## Workflow follow-up

- Человек проверяет изменения, делает коммит и PR (агент предлагает текст).
