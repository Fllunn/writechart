# Архитектура Writechart

Статус: базовая архитектура, этап 1. Устройство самих схем (парсер, раскладка, отрисовка, редактор кода) описывается отдельно и сюда не входит.

## 1. Общая схема

```
Браузер — SPA (React + Vite)
   │  HTTPS, JSON
   ▼
Backend — Node.js 24 + TypeScript + Express 5
   │  SQL
   ▼
PostgreSQL (Docker)

shared/ — Zod-схемы, типы и константы; их импортируют frontend и backend
core/   — ядро схем: код → блок-схема по ГОСТ; пока каркас, первым его импортирует frontend, потом backend
```

Фронт и бэк — отдельные пакеты и отдельные процессы. Контракт между ними — Zod-схемы в `shared/`: одна схема проверяет форму в браузере и запрос на сервере, а TypeScript-тип выводится из неё же.

## 2. Стек

| Область | Выбор | Причина | ADR |
|---|---|---|---|
| Репозиторий | монорепо `frontend/` + `backend/` + `shared/` + `core/` | одна правка API и UI в одном PR, общие типы без публикации пакетов | [0001](adr/0001-monorepo.md) |
| Фронт | React + Vite, SPA | SSR не нужен: редактор работает в браузере; бэкенд виден как отдельная часть | [0002](adr/0002-frontend-spa.md) |
| Бэк | Express 5 + TypeScript | фреймворк из курса Node.js, мало потребляет ресурсов | [0003](adr/0003-backend-express.md) |
| Запуск и сборка бэка | dev — `node --watch` (Node 24 стирает типы), прод — `vite build` в один `dist/server.js` | без шага сборки в dev; на проде не нужен `node_modules` | [0014](adr/0014-backend-build-and-runtime.md) |
| Логи | pino + pino-http, pino-pretty только в dev | JSON в stdout, id у каждого запроса | [0015](adr/0015-logging-pino.md) |
| БД | PostgreSQL | реляционные данные: пользователи, схемы, история, шаблоны | [0004](adr/0004-database-postgresql.md) |
| Драйвер БД | `pg` (`Pool`), без ORM | Drizzle и Prisma 7 работают поверх `pg`, выбор ORM код не ломает | — |
| ORM | не выбрана (Drizzle или Prisma 7) | решение отложено | — |
| Пакеты и задачи | Yarn 4.18.1 (`node-modules`) + Turborepo | совместимость со всеми инструментами; кэш и порядок задач | [0005](adr/0005-yarn-turborepo.md) |
| Node | 24 LTS | официально поддерживается всеми инструментами стека, Corepack в комплекте | [0006](adr/0006-node-24.md) |
| Контракт API | Zod в `shared/` | одна схема для фронта, бэка и типов | [0007](adr/0007-shared-zod.md) |
| Ядро схем | пакет `core/` без сборки, без типов DOM и Node | один код строит схему в браузере, а позже и на бэке | [0016](adr/0016-core-package.md) |
| Библиотеки фронта | React Router, TanStack Query, Zustand, shadcn/ui | разделение серверных и интерфейсных данных | [0008](adr/0008-frontend-libraries.md) |
| TypeScript | 7 (компилятор на Go) | в 8–12 раз быстрее на полной сборке по данным Microsoft; без второй версии TS | [0012](adr/0012-ts7-oxc-tooling.md) |
| Тесты | Vitest, React Testing Library, Supertest, Playwright | пирамида тестов, настоящая база в тестах | [0009](adr/0009-testing.md) |
| Линтер и форматтер | Oxlint (+ oxlint-tsgolint), oxfmt, knip | работают с TS 7; typescript-eslint его не поддерживает | [0012](adr/0012-ts7-oxc-tooling.md) |
| Git | GitHub Flow, merge commit, Conventional Commits | простой процесс для 4 человек, вклад каждого виден | [0010](adr/0010-git-process.md) |
| Разработка с ИИ | AGENTS.md в каждом пакете + OpenSpec | агенты работают по спекам и правилам | [0011](adr/0011-ai-development.md) |
| Скиллы и MCP | сторонние скиллы в репозитории, Context7 | одни правила у всей команды, свежая документация библиотек | [0013](adr/0013-agent-skills-and-mcp.md) |

## 3. Структура репозитория

```
writechart/
├─ frontend/                 # SPA: Vite 8, React 19, React Router 8, TanStack Query, Tailwind 4, shadcn/ui (AGENTS.md внутри)
├─ backend/                  # API: Express 5, pg, pino; сборка Vite в dist/server.js (AGENTS.md внутри)
│  └─ src/                   # app.ts, server.ts, config/, lib/, modules/<фича>/
├─ shared/                   # Zod-схемы, типы, константы (AGENTS.md внутри)
│  └─ src/
├─ core/                     # ядро схем: чистый TypeScript без DOM и Node (AGENTS.md внутри)
│  └─ src/
├─ e2e/                      # E2E на Playwright: собранный фронт + бэк + база в Chromium (AGENTS.md внутри)
│  └─ tests/
├─ openspec/                 # спеки и изменения OpenSpec
│  ├─ specs/                 # текущие спеки по доменам
│  ├─ changes/               # изменения в работе
│  │  └─ archive/            # завершённые изменения
│  └─ config.yaml
├─ docs/
│  ├─ architecture.md        # этот файл
│  ├─ agents-setup.md        # настройка агентов для участников (Context7, скиллы)
│  └─ adr/                   # архитектурные решения
├─ docker/postgres/          # init-скрипт тестовой базы
├─ .agents/skills/           # скиллы для Codex: OpenSpec и сторонние
├─ .claude/                  # скиллы (OpenSpec и сторонние) и команды для Claude Code
├─ .codex/config.toml        # MCP-серверы для Codex (Context7)
├─ .github/                  # шаблон PR, workflows/ci.yml (CI)
├─ AGENTS.md                 # главные инструкции для агентов
├─ CLAUDE.md                 # ссылка на AGENTS.md
├─ README.md                 # о проекте, запуск для разработки
├─ .mcp.json                 # MCP-серверы для Claude Code (Context7)
├─ skills-lock.json          # источник и коммит каждого стороннего скилла
├─ docker-compose.yml        # PostgreSQL: writechart + writechart_test
├─ package.json              # workspaces, packageManager, engines, скрипты dev/build/lint/typecheck/test/format/deps
├─ turbo.json                # задачи Turborepo: build, dev, typecheck, test
├─ tsconfig.base.json        # общие настройки TypeScript, пакеты наследуют через extends
├─ .oxlintrc.json            # Oxlint
├─ .oxfmtrc.json             # oxfmt
├─ .yarnrc.yml               # nodeLinker: node-modules
├─ .nvmrc                    # 24
└─ .gitignore, .gitattributes, .editorconfig, .env.example, .dockerignore
```

## 4. Процесс разработки

- **Git:** GitHub Flow. Ветка от `master`, PR в `master`. Прямой пуш в `master` запрещён, нужен approve от другого члена команды (не автора), слияние только при зелёном CI и актуальной ветке («Update branch», если `master` ушёл вперёд), режим — merge commit.
- **Коммиты:** Conventional Commits со scope (`fix(security): ...`). Автопроверки пока нет.
- **OpenSpec:** каждая работа начинается с изменения в `openspec/changes/`. Автор задачи утверждает proposal своему агенту, агент выполняет `tasks.md`; перед слиянием изменение архивируется в той же ветке, последним коммитом.
- **ИИ-агенты:** Claude Code и Codex. Commit, push и PR делает только человек; агент предлагает текст. Сторонние скиллы лежат в репозитории, документацию библиотек агенты берут из Context7 ([ADR-0013](adr/0013-agent-skills-and-mcp.md)).

## 5. Тесты

| Слой | Инструмент | Что проверяем |
|---|---|---|
| Юнит | Vitest | функции, Zod-схемы, логика |
| Компоненты | Vitest + React Testing Library на jsdom | сложные формы и часть обычных |
| API | Vitest + Supertest | маршруты, права доступа, ошибки |
| База в тестах | PostgreSQL `writechart_test` в Docker | настоящие запросы и миграции |
| E2E | Playwright | главные сценарии |

Установлены: Vitest (`shared/`, `core/`, `frontend/`, `backend/`), React Testing Library с jsdom (`frontend/`), Supertest и база `writechart_test` в тестах (`backend/`). Тесты бэка без базы падают с подсказкой: скопируй `.env.example` в `.env` и запусти `docker compose up -d`. Установлен Playwright (`e2e/`, `yarn e2e`): turbo собирает фронт и бэк, Playwright поднимает `vite preview` (4173) и `dist/server.js` (3100) с базой `writechart_test` и гоняет тесты в Chromium.

Минимальный процент покрытия пока не требуем.

## 6. CI/CD

GitHub Actions, `.github/workflows/ci.yml`: workflow `CI`, две задачи на `ubuntu-latest`, идут параллельно: `check` и `e2e`.

- **Когда:** каждый PR в `master` и каждый push в `master` (то есть после слияния). Запуски на `master` наполняют кэш Yarn, которым пользуются все PR.
- **Шаги `check`:** `corepack enable` → Node из `.nvmrc` с кэшем Yarn → `yarn install --immutable` → `yarn lint`, `yarn format:check`, `yarn deps`, `yarn typecheck`, `yarn test`, `yarn build`.
- **Шаги `e2e`:** те же до `yarn install --immutable` → `playwright install --with-deps chromium --only-shell` → `yarn e2e`; при падении HTML-отчёт с trace — артефакт `playwright-report` на 14 дней.
- **База:** сервис `postgres:18` в задачах `check` и `e2e` (`POSTGRES_DB: writechart_test`, порт 5432) и `DATABASE_URL_TEST` на уровне задачи — для тестов бэка в `yarn test` и для бэка в `yarn e2e`.
- **Защита `master`** (настройки GitHub): обязательные проверки `check` и `e2e`, ветка должна быть актуальной перед слиянием.

Деплой — на свой сервер, детали отложены.

## 7. Отложено

- ORM (Drizzle или Prisma 7), миграции и очистка базы между тестами — вместе
- `trust proxy`, `compression` — изменение про деплой
- `express-rate-limit` — деплой и вход (без правильного `trust proxy` считает IP неверно)
- `cookie-parser` — вход
- как прод отдаёт фронт и `/api` (nginx или Express), Docker-образ бэка — деплой
- отдельная CI-задача для тестов с базой — когда тесты с базой станут заметно тормозить CI
- деплой на сервер и окружения (staging, preview)
- устройство схем (парсер, раскладка, отрисовка) — следующее изменение, `add-flowchart-python`
- полноценный редактор кода
- другие MCP-серверы (shadcn, PostgreSQL) — вместе с изменениями, где они нужны
- автопроверка сообщений коммитов
- трекер задач, роли и CODEOWNERS
