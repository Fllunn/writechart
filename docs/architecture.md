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
| Тесты | Vitest, React Testing Library, Supertest, Playwright; ESLint + Prettier | пирамида тестов, настоящая база в тестах | [0009](adr/0009-testing.md) |
| Git | GitHub Flow, merge commit, Conventional Commits | простой процесс для 4 человек, вклад каждого виден | [0010](adr/0010-git-process.md) |
| Разработка с ИИ | AGENTS.md в каждом пакете + OpenSpec | агенты работают по спекам и правилам | [0011](adr/0011-ai-development.md) |

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
│  └─ adr/                   # архитектурные решения
├─ docker/postgres/          # init-скрипт тестовой базы
├─ .agents/skills/           # скиллы OpenSpec для Codex
├─ .claude/                  # скиллы и команды OpenSpec для Claude Code
├─ .github/                  # шаблон PR (позже — CI)
├─ AGENTS.md                 # главные инструкции для агентов
├─ CLAUDE.md                 # ссылка на AGENTS.md
├─ docker-compose.yml        # PostgreSQL: writechart + writechart_test
├─ package.json              # workspaces, packageManager, engines
├─ .yarnrc.yml               # nodeLinker: node-modules
├─ .nvmrc                    # 24
└─ .gitignore, .gitattributes, .editorconfig, .env.example, .dockerignore
```

## 4. Процесс разработки

- **Git:** GitHub Flow. Ветка от `master`, PR в `master`. Прямой пуш в `master` запрещён, одобрения не требуются, слияние только при зелёном CI, режим — merge commit.
- **Коммиты:** Conventional Commits со scope (`fix(security): ...`). Автопроверки пока нет.
- **OpenSpec:** каждая работа начинается с изменения в `openspec/changes/`. Человек утверждает proposal, агент выполняет `tasks.md`, после слияния изменение архивируется.
- **ИИ-агенты:** Claude Code и Codex. Commit, push и PR делает только человек; агент предлагает текст.

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

Планируется (отдельное изменение OpenSpec): GitHub Actions на каждый PR — установка через Corepack, `turbo run lint typecheck test build` с сервисом PostgreSQL, Playwright. Деплой — на свой сервер, детали отложены.

## 7. Отложено

- ORM (Drizzle или Prisma 7)
- деплой на сервер и окружения (staging, preview)
- редактор кода и устройство схем
- лицензия (`LICENSE`)
- MCP-серверы (в том числе Context7)
- автопроверка сообщений коммитов
- трекер задач, роли и CODEOWNERS
