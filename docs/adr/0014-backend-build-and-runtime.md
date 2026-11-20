# ADR-0014: Запуск и сборка бэка — Node без сборки в dev, Vite на прод

Статус: принято · 2026-11-20

## Контекст

Бэк пишется на TypeScript ([ADR-0003](0003-backend-express.md)). Код нужно запускать в dev с перезапуском при правке и собирать для прода. Пакет `shared` — без сборки: его `exports` указывают на исходники `.ts` ([ADR-0007](0007-shared-zod.md)), их компилирует тот, кто импортирует.

Node 24 сам стирает типы из `.ts` (type stripping, «Stability: 2 – Stable» с v24.12.0). Ограничения: расширения в импортах обязательны, типы — через `import type`, нельзя `enum`, `namespace` с кодом и parameter properties; файлы `.ts` внутри `node_modules` Node не обрабатывает (у `shared` настоящий путь вне `node_modules`, через симлинк воркспейса работает — проверено).

Vite 8 уже стоит во `frontend/` и `shared/` и умеет собирать сервер (`build.ssr`).

## Решение

- **dev:** `node --watch --env-file-if-exists=../.env src/server.ts`. Node стирает типы сам, `--watch` перезапускает процесс при правке.
- **прод:** `vite build` (в GitHub Actions) → один файл `backend/dist/server.js` со всеми пакетами и `shared` внутри: `build.ssr: 'src/server.ts'`, `ssr.noExternal: true`, `ssr.target: 'node'`, `build.target: 'node24'`, `sourcemap: true`.
- **start:** `NODE_ENV=production node --enable-source-maps dist/server.js`. Карта исходников нужна, чтобы стек ошибки в логе указывал на `src/*.ts`.
- **Правила кода** в `backend/` и `shared/`: импорт своих файлов с `.ts`, `import type` для типов, без `enum`, `namespace` с кодом, parameter properties. Их проверяет `yarn typecheck`: в `backend/tsconfig.json` — `module`/`moduleResolution: nodenext`, `allowImportingTsExtensions`, `erasableSyntaxOnly`; в `shared/tsconfig.json` — `allowImportingTsExtensions`, `erasableSyntaxOnly`.

## Варианты

- **tsx** (dev). Работает, но медленнее на старте и лишний пакет, когда Node стирает типы сам.
- **tsdown** (прод). Тот же результат (тоже rolldown), но новый пакет до 1.0; Vite уже стоит.
- **`tsc` в `dist`** (прод). Не собирает `shared`: пакет без сборки, его `.ts` остались бы в `node_modules`, где Node их не исполняет.
- **Node без сборки на проде.** Type stripping — свежая возможность, крупные проекты на нём прод не гоняют; нужен `node_modules` на сервере.

Замеры на машине человека (тестовый сервер Express + pg + pino, 20.11.2026):

| Что | Результат |
|---|---|
| старт в dev: `node` / `tsx` | ~370 мс / ~548 мс |
| `vite build` | ~130 мс, файл 1,19 МБ |
| старт бандла из папки без `node_modules` | ~195 мс |
| запросов в секунду: бандл / без сборки | ~17 500 / ~17 500 |

Бандл каркаса (с pino-http, helmet, zod) — 1,39 МБ.

## Последствия

- В dev нет шага сборки; на проде нужен только `dist/` без `node_modules`.
- Нельзя `enum`, `namespace` с кодом и parameter properties ни в `backend/`, ни в `shared/`.
- Пакет, который не работает внутри бандла (динамический `require`, файлы рядом с модулем), выносится в `ssr.external` с записью в design изменения.
- На Windows Ctrl+C в `yarn dev` останавливает сервер принудительно: родитель `node --watch` эмулирует сигнал жёстким завершением. Мягкая остановка работает без `--watch` и на Linux.
