# Tasks

## 1. Turborepo

- [ ] 1.1 Добавить `turbo` в devDependencies корня и `turbo.json` с задачами `typecheck`, `test` (`outputs: []`); корневые скрипты `typecheck`, `test` через `turbo run`; проверить: `yarn turbo --version` выводит версию

## 2. TypeScript 7

- [ ] 2.1 Добавить `typescript@~7.0.2` в devDependencies `shared/`; создать `tsconfig.base.json` (design, решение 3) и `shared/tsconfig.json` с `extends`; проверить: `yarn workspace @writechart/shared tsc -v` выводит 7.0.x

## 3. Vitest

- [ ] 3.1 Добавить `vitest` в devDependencies `shared/`, скрипты `test` (`vitest run`) и `typecheck` (`tsc --noEmit`), тест `shared/src/toolchain.test.ts`; проверить: `yarn test` и `yarn typecheck` из корня проходят

## 4. Oxlint

- [ ] 4.1 Добавить в корень `oxlint`, `oxlint-tsgolint`; создать `.oxlintrc.json` (design, решение 4); скрипт `lint` = `oxlint --type-aware --deny-warnings`; проверить: `yarn lint` проходит и в выводе видно, что проверены файлы `shared/src`
- [ ] 4.2 Проверить правило по типам: временно добавить в `shared/src` вызов async-функции без `await`, `yarn lint` даёт ошибку `no-floating-promises`; убрать

## 5. knip

- [ ] 5.1 Добавить `knip` в корень, скрипт `deps` = `knip --strict --include unlisted,unresolved` (design, решение 6); проверить: `yarn deps` проходит
- [ ] 5.2 Проверить правило: временный импорт пакета, объявленного только в корне, из `shared/src/*.ts` даёт ошибку `yarn deps`; импорт `vitest` в тесте `shared/` ошибки не даёт; убрать временный импорт

## 6. oxfmt

- [ ] 6.1 Добавить `oxfmt@0.79.0` (точная версия) в корень, `.oxfmtrc.json`, файл игнора (design, решение 5), скрипты `format` (`oxfmt`) и `format:check` (`oxfmt --check`); прогнать `yarn format`; проверить: `yarn format:check` проходит

## 7. Документация

- [ ] 7.1 Написать `docs/adr/0012-…md` (design, решение 9) и добавить строку в `docs/adr/README.md`, у ADR-0009 статус «частично заменён ADR-0012»; проверить: в ADR есть разделы Контекст / Решение / Варианты / Последствия
- [ ] 7.2 Обновить корневой `AGENTS.md`: команды `yarn lint`, `yarn typecheck`, `yarn test`, `yarn format`, `yarn deps`; стек; список «решено, но не установлено» (убрать установленное, ESLint + Prettier заменить); проверить: команды совпадают со скриптами `package.json`
- [ ] 7.3 Обновить `docs/architecture.md` (таблица стека, раздел «Тесты», CI-план, структура репо с новыми файлами) и упоминания ESLint в `frontend/AGENTS.md`, `backend/AGENTS.md`, если есть; проверить: `grep -ri "eslint\|prettier" docs AGENTS.md frontend backend shared` находит только ADR-0009, ADR-0012 и ссылки на замену

## 8. Итоговая проверка

- [ ] 8.1 Прогнать `yarn install --immutable`, `yarn lint`, `yarn typecheck`, `yarn test`, `yarn format:check`, `yarn deps`, повторный `yarn test` (turbo показывает cache hit) и `yarn openspec validate setup-dev-tooling`; проверить: всё без ошибок; записать фактические версии из `yarn.lock`

## Workflow follow-up

- Человек проверяет изменения, делает коммит и PR (агент предлагает текст).
- После слияния — `openspec archive setup-dev-tooling`.
