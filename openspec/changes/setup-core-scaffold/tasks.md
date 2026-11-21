# Tasks

## 1. Пакет `core/`

- [ ] 1.1 Создать `core/package.json` (`@writechart/core`, `private`, `type: module`, `exports: { "./*": "./src/*.ts" }`, скрипты `typecheck` и `test`, dev-зависимости `typescript ~7.0.2`, `vite ^8.3.8`, `vitest ^5.1.1`) и добавить `core` в `workspaces` корневого `package.json` (design, решения 1 и 7); проверить: `yarn install` без ошибок, новых пакетов из npm в `yarn.lock` нет (только запись воркспейса), `yarn workspaces list` показывает `@writechart/core`
- [ ] 1.2 Создать `core/tsconfig.json` (наследует `tsconfig.base.json`; `lib: ["ES2024"]`, `types: []`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, `include: ["src"]`) (design, решения 2 и 3); проверить: временный файл в `core/src/` с `document`, `process` и `enum` даёт ошибки `yarn workspace @writechart/core typecheck`; временный файл удалён, `yarn typecheck` проходит
- [ ] 1.3 Сверить через Context7 поведение Vitest 5 по умолчанию (`include`, `environment`), затем создать `core/src/toolchain.test.ts` по образцу `shared/` с комментарием «удалить, когда появится первый код ядра с тестом» (design, решение 4); проверить: `yarn workspace @writechart/core test` находит и проходит один тест, а с намеренно неверным `expect` падает
- [ ] 1.4 Проверить, что Turborepo видит пакет без правки `turbo.json` (design, решение 6); проверить: `turbo run typecheck test --dry=json` содержит `@writechart/core#typecheck` и `@writechart/core#test`; `yarn typecheck` и `yarn test` запускают их

## 2. Документация

- [ ] 2.1 Создать `core/AGENTS.md` (design, решение 9; скилл `writing-for-agents`); проверить: правила в файле совпадают с `core/tsconfig.json` и `core/package.json`, ссылки на `../AGENTS.md` и ADR открываются
- [ ] 2.2 Обновить корневой `AGENTS.md`: строка `core/` в таблице пакетов (скилл `writing-for-agents`); проверить: таблица перечисляет все папки из `workspaces`
- [ ] 2.3 Написать `docs/adr/0016-core-package.md` (Контекст → Решение → Варианты → Последствия, design, решение 8) и строку в `docs/adr/README.md`; проверить: формат как у ADR-0014, ссылка из README открывается
- [ ] 2.4 Обновить `docs/architecture.md`: схема в разделе 1, строка в таблице стека со ссылкой на ADR-0016, `core/` в структуре, раздел «Отложено» (design, решение 9); проверить: структура в документе совпадает с папками репозитория

## 3. Проверка локально

- [ ] 3.1 Прогнать `yarn lint`, `yarn format` дважды и `yarn format:check`, `yarn deps`, `yarn typecheck`, `yarn test`, `yarn build`, `yarn e2e` и `yarn openspec validate setup-core-scaffold` (design, решения 5 и 6); проверить: всё без ошибок; если Oxlint или knip потребовали правок настройки — причина записана в design

## 4. Проверка на GitHub (человек)

- [ ] 4.1 Человек пушит ветку от `master` и открывает PR; проверить: `CI / check` и `CI / e2e` зелёные, в логе `yarn typecheck` и `yarn test` есть `@writechart/core`

## Workflow follow-up

- После ревью и зелёного CI, перед слиянием: `/opsx:archive setup-core-scaffold` в этой же ветке; человек коммитит архив последним коммитом и сливает PR.
