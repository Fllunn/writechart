# AGENTS.md — backend

Сначала прочитай корневой [`../AGENTS.md`](../AGENTS.md): процесс OpenSpec и правила Git действуют и здесь.

## Что здесь

HTTP API: Node.js 24 + TypeScript + Express 5, база PostgreSQL (`docker compose up -d` в корне). ORM ещё не выбрана, не добавляй её без изменения в OpenSpec.

## Правила папки

- Каждый входящий запрос проверяй Zod-схемой из `@writechart/shared`.
- Не импортируй код из `frontend/`.
- Секреты и адреса бери только из переменных окружения. Новые переменные добавляй в корневой `.env.example` без значений.
- Права доступа проверяй на сервере всегда, даже если фронт уже что-то скрыл.

## Запросы и ошибки

- Проверка запроса — `Schema.parse(req.body)` прямо в обработчике маршрута: тип выводится из схемы, `ZodError` сам уходит в обработчик ошибок (Express 5 передаёт исключения из async-обработчиков) → 400 `validation_failed`. Своего `validate()`-middleware не делай.
- Ожидаемая ошибка — `throw new AppError(status, code, message)` из `src/lib/errors.ts`; `code` — строчные латинские буквы и `_`. Ответ собирает один обработчик `src/lib/http/error-handler.ts` в формате `ApiError` из `@writechart/shared/api-error`.
- Всё прочее обработчик отдаёт как 500 `internal_error` с общим текстом; стек пишется только в лог. Сам не пиши `res.status(4xx/5xx).json(...)` с другим форматом. Единственное исключение — 503 от `GET /api/health/ready`: его тело `{ status, db }` задаёт `ReadyResponse` (`specs/api-health`), мониторинг читает его как ответ проверки, а не как ошибку API.

## Тесты

- Vitest + Supertest, файлы `*.test.ts` рядом с кодом. Граница теста — HTTP-ответ `createApp`; тестовые маршруты добавляй через `registerRoutes`, без моков.
- Настоящая база `writechart_test` в Docker (`DATABASE_URL_TEST` из корневого `.env`), без моков базы. Перед `yarn test`: скопируй `.env.example` в `.env` и запусти `docker compose up -d`. Без базы `src/test-global-setup.ts` роняет тесты с этой подсказкой.
- Ответы с ошибкой разбирай схемой `ApiError`, ответы маршрутов — их схемами из `shared`: так тест проверяет и контракт.

## Структура

```
src/
  app.ts            # createApp({ pool, logger, registerRoutes? }): middleware, маршруты, 404, ошибки; без listen
  server.ts         # env → logger → pool → createApp → listen; мягкая остановка
  config/env.ts     # Zod-схема переменных окружения, parseEnv(source)
  lib/              # общее: db.ts, logger.ts, errors.ts, http/
  modules/<фича>/   # код фичи: <фича>.router.ts и тесты рядом
```

- Новая фича — новая папка `src/modules/<фича>/`. Имена файлов — kebab-case.
- Зависимости (`pool`, `logger`) `createApp` получает аргументом. Глобального состояния нет.
- Логи — через `req.log` в обработчике (в строке есть id запроса) или через общий логгер. `console` не используй ([ADR-0015](../docs/adr/0015-logging-pino.md)). Исключение — ошибка env на старте, когда логгера ещё нет.

## Правила кода

В dev Node 24 исполняет `.ts` сам, без сборки: он только стирает типы ([ADR-0014](../docs/adr/0014-backend-build-and-runtime.md)). Поэтому:

- Импорт своих файлов — с расширением `.ts`: `import { createApp } from "./app.ts"`.
- Типы импортируй через `import type`.
- Нельзя `enum`, `namespace` с кодом и parameter properties (`constructor(private x)`). Вместо `enum` — объект `as const` или union строк.

Нарушения ловит `yarn typecheck` (`module: nodenext`, `erasableSyntaxOnly`).
