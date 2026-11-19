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
```

Фронт и бэк — отдельные пакеты и отдельные процессы. Контракт между ними — Zod-схемы в `shared/`: одна схема проверяет форму в браузере и запрос на сервере, а TypeScript-тип выводится из неё же.

## 2. Стек

| Область | Выбор | Причина | ADR |
|---|---|---|---|
| Репозиторий | монорепо `frontend/` + `backend/` + `shared/` | одна правка API и UI в одном PR, общие типы без публикации пакетов | [0001](adr/0001-monorepo.md) |
| Фронт | React + Vite, SPA | SSR не нужен: редактор работает в браузере; бэкенд виден как отдельная часть | [0002](adr/0002-frontend-spa.md) |
| Бэк | Express 5 + TypeScript | фреймворк из курса Node.js, мало потребляет ресурсов | [0003](adr/0003-backend-express.md) |
| БД | PostgreSQL | реляционные данные: пользователи, схемы, история, шаблоны | [0004](adr/0004-database-postgresql.md) |
| ORM | не выбрана (Drizzle или Prisma 7) | решение отложено | — |
| Пакеты и задачи | Yarn 4.18.1 (`node-modules`) + Turborepo | совместимость со всеми инструментами; кэш и порядок задач | [0005](adr/0005-yarn-turborepo.md) |
| Node | 24 LTS | официально поддерживается всеми инструментами стека, Corepack в комплекте | [0006](adr/0006-node-24.md) |
| Контракт API | Zod в `shared/` | одна схема для фронта, бэка и типов | [0007](adr/0007-shared-zod.md) |
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
├─ frontend/                 # SPA (AGENTS.md внутри)
├─ backend/                  # API (AGENTS.md внутри)
├─ shared/                   # Zod-схемы, типы, константы (AGENTS.md внутри)
│  └─ src/
├─ openspec/                 # спеки и изменения OpenSpec
│  ├─ specs/                 # текущие спеки по доменам
│  ├─ changes/               # изменения в работе
│  │  └─ archive/            # завершённые изменения
│  └─ config.yaml
├─ docs/
│  ├─ architecture.md        # этот файл
│  ├─ agents-setup.md        # настройка агентов для участников (Context7)
│  └─ adr/                   # архитектурные решения
├─ docker/postgres/          # init-скрипт тестовой базы
├─ .agents/skills/           # скиллы для Codex: OpenSpec и сторонние
├─ .claude/                  # скиллы (OpenSpec и сторонние) и команды для Claude Code
├─ .codex/config.toml        # MCP-серверы для Codex (Context7)
├─ .github/                  # шаблон PR, workflows/ci.yml (CI)
├─ AGENTS.md                 # главные инструкции для агентов
├─ CLAUDE.md                 # ссылка на AGENTS.md
├─ .mcp.json                 # MCP-серверы для Claude Code (Context7)
├─ skills-lock.json          # источник и коммит каждого стороннего скилла
├─ docker-compose.yml        # PostgreSQL: writechart + writechart_test
├─ package.json              # workspaces, packageManager, engines, скрипты lint/typecheck/test/format/deps
├─ turbo.json                # задачи Turborepo: typecheck, test
├─ tsconfig.base.json        # общие настройки TypeScript, пакеты наследуют через extends
├─ .oxlintrc.json            # Oxlint
├─ .oxfmtrc.json             # oxfmt
├─ .yarnrc.yml               # nodeLinker: node-modules
├─ .nvmrc                    # 24
└─ .gitignore, .gitattributes, .editorconfig, .env.example, .dockerignore
```

## 4. Процесс разработки

- **Git:** GitHub Flow. Ветка от `master`, PR в `master`. Прямой пуш в `master` запрещён, одобрения не требуются, слияние только при зелёном CI и актуальной ветке («Update branch», если `master` ушёл вперёд), режим — merge commit.
- **Коммиты:** Conventional Commits со scope (`fix(security): ...`). Автопроверки пока нет.
- **OpenSpec:** каждая работа начинается с изменения в `openspec/changes/`. Человек утверждает proposal, агент выполняет `tasks.md`; перед слиянием изменение архивируется в той же ветке, последним коммитом.
- **ИИ-агенты:** Claude Code и Codex. Commit, push и PR делает только человек; агент предлагает текст. Сторонние скиллы лежат в репозитории, документацию библиотек агенты берут из Context7 ([ADR-0013](adr/0013-agent-skills-and-mcp.md)).

## 5. Тесты

| Слой | Инструмент | Что проверяем |
|---|---|---|
| Юнит | Vitest | функции, Zod-схемы, логика |
| Компоненты | Vitest + React Testing Library | сложные формы и часть обычных |
| API | Vitest + Supertest | маршруты, права доступа, ошибки |
| База в тестах | PostgreSQL `writechart_test` в Docker | настоящие запросы и миграции |
| E2E | Playwright | главные сценарии |

Минимальный процент покрытия пока не требуем.

## 6. CI/CD

GitHub Actions, `.github/workflows/ci.yml`: workflow `CI`, одна задача `check` на `ubuntu-latest`.

- **Когда:** каждый PR в `master` и каждый push в `master` (то есть после слияния). Запуски на `master` наполняют кэш Yarn, которым пользуются все PR.
- **Шаги:** `corepack enable` → Node из `.nvmrc` с кэшем Yarn → `yarn install --immutable` → `yarn lint`, `yarn format:check`, `yarn deps`, `yarn typecheck`, `yarn test`.
- **Защита `master`** (настройки GitHub): обязательная проверка `check`, ветка должна быть актуальной перед слиянием.
- **Позже:** сервис PostgreSQL (с первым тестом базы), `build` и Playwright (с каркасами).

Деплой — на свой сервер, детали отложены.

## 7. Отложено

- ORM (Drizzle или Prisma 7)
- деплой на сервер и окружения (staging, preview)
- редактор кода и устройство схем
- лицензия (`LICENSE`)
- другие MCP-серверы (shadcn, PostgreSQL) — вместе с изменениями, где они нужны
- файлы лицензий MIT для сторонних скиллов
- автопроверка сообщений коммитов
- трекер задач, роли и CODEOWNERS
