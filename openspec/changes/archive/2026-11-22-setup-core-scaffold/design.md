# Design

## Context

Мотивация — в proposal.md, раздел Why.

Образец — `shared/`: пакет без сборки (`exports: { "./*": "./src/*.ts" }`), `tsconfig.json` наследует `tsconfig.base.json` и добавляет `allowImportingTsExtensions` и `erasableSyntaxOnly`, скрипты `typecheck` (`tsc --noEmit`) и `test` (`vitest run`), конфига Vitest нет, один тест-проверка `src/toolchain.test.ts`. Dev-зависимости `typescript ~7.0.2`, `vite ^8.3.8`, `vitest ^5.1.1`.

`tsconfig.base.json`: `target: ES2024`, `module: preserve`, `moduleResolution: bundler`, `strict`, `noEmit`. Поля `lib` нет, поэтому по умолчанию к `target` добавляются типы DOM. Turborepo запускает `typecheck` и `test` во всех воркспейсах, где есть такие скрипты. Oxlint настроен в корне: `env.builtin` для всех, `browser` для `frontend/**`, `node` для `backend/**` и `e2e/**`.

Замер 21.11.2026, TypeScript 7.0.2, отдельная папка вне репозитория: `tsconfig` с `lib: ["ES2024"]` даёт ошибку на `document` (TS2584), `process` (TS2591), `TextEncoder` и `structuredClone` (TS2304).

Решения грилинга, на которые опирается каркас: ядро в отдельном пакете `core/` (а не в `shared/` или `frontend/src/`), в первой версии работает в браузере, код не привязан ни к браузеру, ни к Node, парсер ядро получает аргументом.

## Goals / Non-Goals

**Goals:**
- `@writechart/core` — воркспейс, который проходит все проверки (`lint`, `format:check`, `deps`, `typecheck`, `test`, `build`, `e2e`) локально и в CI.
- Обращение к API браузера или Node в `core/src/` ломает `yarn typecheck`.

**Non-Goals:**
- Код ядра и его зависимости (tree-sitter и прочее) — изменение `add-flowchart-python`.
- Импорт `@writechart/core` во фронте или бэке: появится вместе с первым кодом ядра.
- Правила раскладки `core/src/` по папкам (языки, модель, раскладка, отрисовка) — решим с первым кодом.
- Правка `shared/`: там тоже нет `lib`, типы DOM видны. Это отдельный вопрос, здесь не трогаем.

## Decisions

1. **Пакет без сборки, как `shared/`.** `core/package.json`: `name: @writechart/core`, `private`, `type: module`, `exports: { "./*": "./src/*.ts" }`. Импорт по подпутям (`@writechart/core/flowchart`), без `index.ts` с `export *`.
   - Почему не своя сборка: фронт собирает Vite, бэк на проде тоже собирает Vite в один файл, в dev Node стирает типы сам ([ADR-0014](../../../docs/adr/0014-backend-build-and-runtime.md)). Отдельный `dist/` ничего не даёт и требует задачи `build` перед `typecheck` и `test`.
   - Вариант «сборка через tsc или tsdown» отклонён по той же причине, что в ADR-0014 для `shared/`.

2. **Ни DOM, ни Node в типах.** `core/tsconfig.json` наследует `tsconfig.base.json` и задаёт `lib: ["ES2024"]` и `types: []`, плюс `allowImportingTsExtensions`, `erasableSyntaxOnly`, `include: ["src"]`.
   - `lib: ["ES2024"]` убирает типы DOM (замер в Context).
   - `types: []` не даёт подхватить `@types/node`, который в корне `node_modules` оказался из-за других пакетов. В замере вне репозитория `@types/node` не было, поэтому задача 1.2 проверяет это уже внутри репозитория: `process` в `core/src/` — ошибка типов.
   - Следствие: в ядре нет и общих для браузера и Node API (`TextEncoder`, `structuredClone`, `URL`, `console`). Если какое-то понадобится, добавляем его объявление явно и записываем в `core/AGENTS.md`, а не включаем `DOM` целиком.
   - Вариант «правило Oxlint вместо `lib`» отклонён: линтер ловит глобальные имена, но не типы. `lib` закрывает и то и другое.

3. **Правила синтаксиса Node, как в `shared/`.** Импорт своих файлов с `.ts`, типы через `import type`, без `enum`, `namespace` с кодом и parameter properties. Бэк позже импортирует ядро и в dev исполняет его через Node без сборки. Проверяет `yarn typecheck` (`allowImportingTsExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax` из base).

4. **Тесты — Vitest без конфига.** Как в `shared/`: Vitest по умолчанию ищет `*.test.ts` и запускает их в окружении `node`. Окружение DOM ядру не нужно. Один файл `src/toolchain.test.ts` с комментарием «удалить, когда появится первый код ядра с тестом». Его удалит `add-flowchart-python`. Перед задачей 1.3 сверяем поведение Vitest 5 по умолчанию (`include`, `environment`) через Context7.
   - `vite` в dev-зависимостях, как в `shared/`: это peer-зависимость Vitest.

5. **Oxlint без правок.** Для `core/**` override не добавляем: работает общий `env.builtin`, глобальных имён браузера и Node линтер не знает. Задача 3.1 проверяет, что `yarn lint` проходит. Если Oxlint что-то потребует для нового воркспейса, правим `.oxlintrc.json` и записываем причину сюда.

6. **Turborepo и CI без правок.** Задачи `typecheck` и `test` в `turbo.json` общие для всех пакетов. Сборки у `core/` нет, `build` его не касается. Задача 1.4 проверяет `turbo run typecheck test --dry=json`: в списке есть `@writechart/core#typecheck` и `@writechart/core#test`.

7. **Воркспейс в корне.** В `workspaces` корневого `package.json` добавляем `core` (порядок: `frontend`, `backend`, `shared`, `core`, `e2e`). `yarn install` пишет в `yarn.lock` запись воркспейса. Новых пакетов из npm нет: версии `typescript`, `vite`, `vitest` — те же, что в `shared/`, Yarn берёт их из того же `yarn.lock`.

8. **ADR-0016 «Ядро схем в пакете `core`».** Контекст: ядро нужно фронту сейчас и бэку потом, схема в первой версии строится в браузере. Решение: пакет `core/` без сборки, без типов DOM и Node, парсер и всё, что зависит от среды, ядро получает аргументом, правила синтаксиса Node. Варианты: `shared/` (там только схемы и типы, пакет станет свалкой), `frontend/src/` (бэку импортировать нельзя), построение на бэке (задержка сети и нагрузка на свои серверы). Последствия: ещё один воркспейс; данные ядра, которые пойдут по API, всё равно описываем Zod-схемой в `shared/`. Остальные решения ядра (tree-sitter, своя раскладка, SVG) — отдельные ADR в `add-flowchart-python`.

9. **Документация.**
   - `core/AGENTS.md`: что здесь; правила: чистый TypeScript, без React, DOM, Node и `fs`; парсер и всё зависящее от среды — аргументом; правила синтаксиса Node; импорт по подпутям; не импортировать из `frontend/` и `backend/`; данные для API — Zod-схемы в `shared/`; тесты `*.test.ts` рядом с кодом.
   - Корневой `AGENTS.md`: строка `core/` в таблице пакетов.
   - `docs/architecture.md`: схема в разделе 1, строка в таблице стека, папка в структуре, раздел «Отложено» (устройство схем — в работе, редактор кода по-прежнему отложен). Строку статуса в начале не меняем: устройство схем описывает `add-flowchart-python`.
   - `docs/adr/README.md`: строка ADR-0016.

10. **Скиллы при реализации.** `writing-for-agents` — задача 2.1 (`core/AGENTS.md`) и правка корневого `AGENTS.md`.

## Risks / Trade-offs

- [`types: []` в TS 7 ведёт себя иначе, чем ожидаем] → задача 1.2 проверяет внутри репозитория: `process` и `document` в `core/src/` дают ошибку, обычный код без них проходит.
- [knip ругается на новый воркспейс без импортов] → `yarn deps` смотрит только `unlisted` и `unresolved`, неиспользуемые файлы и экспорты не проверяет. Задача 3.1 проверит. Если knip ошибается, правим его настройку, проверку не выключаем.
- [Тест-заглушка в `core/`] → это сознательно, как в `shared/`: иначе `vitest run` падает «No test files found». Удаляется с первым настоящим тестом в `add-flowchart-python`.
- [Ядро без `TextEncoder`, `console` и подобного] → может понадобиться позже. Решение 2 говорит, как добавить точечно.
