# Proposal

## Why

В `backend/` пока только `package.json` и `AGENTS.md`. API писать не на чем. Нужен каркас Express 5 (ADR-0003) с подключением к PostgreSQL (ADR-0004), проверкой запросов схемами из `shared` (ADR-0007), логами, единым форматом ошибок и тестами API на настоящей базе (ADR-0009). Тогда следующие изменения займутся функциями, а не настройкой.

Это второе из трёх изменений (решение человека): фронт → бэк → Playwright.

## What Changes

Все решения ниже — решения человека в допросе перед этим изменением.

- **Express 5 + TypeScript** в `backend/`. Приложение собирает `createApp()` без `listen` (для Supertest), сервер запускает `server.ts`.
- **Структура по фичам:** `src/modules/<фича>/`; общее — в `src/lib/` (база, логи, ошибки, HTTP), настройки — в `src/config/`.
- **Запуск TS:** в dev — `node --watch` (Node 24 сам стирает типы); на прод — `vite build` в GitHub Actions собирает один `dist/server.js` со всеми пакетами внутри. Код следует правилам Node: импорты своих файлов с `.ts`, без `enum` и `namespace`. **ADR-0014.**
- **Переменные окружения:** `.env` из корня грузит Node флагом `--env-file-if-exists`; Zod-схема проверяет переменные на старте, при ошибке процесс выходит с понятным текстом.
- **PostgreSQL:** драйвер `pg` (`Pool`), без ORM. ORM выберем отдельным решением; Drizzle и Prisma 7 работают поверх `pg`.
- **Логи:** pino + pino-http (у каждого запроса свой id), pino-pretty только в dev. **ADR-0015.**
- **Middleware:** `pino-http` → `helmet` → `express.json()` (лимит 100 КБ). `trust proxy`, лимит частоты запросов, сжатие и `cookie-parser` отложены до деплоя и входа.
- **Ошибки:** единый ответ `{ error: { code, message, details? } }` (схема в `shared`), один обработчик ошибок, 404 на неизвестный адрес API. Сбой процесса → лог и выход.
- **Проверка запросов:** `Schema.parse(...)` в обработчике маршрута; ошибка проверки → 400.
- **Health-check:** `GET /api/health` (процесс жив, базу не трогает) и `GET /api/health/ready` (`SELECT 1`, 200 или 503). Схемы ответов в `shared`.
- **Мягкая остановка:** на `SIGTERM`/`SIGINT` сервер дожидается текущих запросов, закрывает базу и выходит; страховочный таймер 10 с.
- **Прокси с фронта:** фронт ходит на относительный `/api`, в dev Vite пересылает `/api` на бэк. CORS не нужен.
- **Тесты:** Vitest + Supertest, база `writechart_test` в Docker; без базы `yarn test` падает с понятной ошибкой.
- **CI:** сервис `postgres:18` в задаче `check`.
- **`shared`:** пакет `zod` 4, схемы ошибки и health.
- **Документация:** ADR-0014, ADR-0015, `docs/architecture.md`, `AGENTS.md` (корень, `backend/`, `shared/`).

Вне рамок: ORM и миграции, таблицы, вход и сессии, `trust proxy`, лимит частоты запросов, сжатие, `cookie-parser`, отдельная CI-задача для тестов с базой, способ отдачи фронта и `/api` на проде (nginx или Express), Docker-образ бэка, деплой, Playwright.

## Capabilities

### New Capabilities

- `api-health`: адреса проверки состояния сервера: «жив» без базы и «готов» с проверкой базы.
- `api-errors`: единый формат ошибок API и коды ответов для неизвестного адреса, неверного запроса и внутренней ошибки.

### Modified Capabilities

Нет.

## Impact

- Новые файлы в `backend/` (исходники, тесты, `tsconfig.json`, `vite.config.ts`) и `shared/src/` (схемы).
- Новые зависимости в `backend/package.json` и `zod` в `shared/package.json` (список и версии в design).
- Правки: `frontend/vite.config.ts` (прокси), `shared/tsconfig.json`, `.oxlintrc.json`, `.github/workflows/ci.yml`, `.env.example`, `yarn.lock`, `AGENTS.md`, `backend/AGENTS.md`, `shared/AGENTS.md`, `docs/architecture.md`, `docs/adr/README.md`, новые `docs/adr/0014-*.md`, `docs/adr/0015-*.md`.
- `yarn test` локально теперь требует запущенный `docker compose up -d`.
- CI станет дольше на старт контейнера Postgres и сборку бэка.
