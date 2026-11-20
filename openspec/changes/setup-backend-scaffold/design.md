# Design

## Context

`backend/package.json` пустой (`name`, `private`, `type: module`), кроме него есть только `backend/AGENTS.md`. В корне: TypeScript 7.0.2, Oxlint с проверками по типам, oxfmt, knip `--strict --include unlisted,unresolved`, Turborepo с задачами `build`, `dev`, `typecheck`, `test`. В `shared/` только `toolchain.test.ts`, `zod` нет. `tsconfig.base.json`: `module: preserve`, `moduleResolution: bundler`, `strict`, `noEmit`, `verbatimModuleSyntax`. `docker-compose.yml` поднимает `postgres:18` с базами `writechart` и `writechart_test`. CI: одна задача `check`, базы нет. Фронт: Vite 8.3.8, Vitest 5.1.1, прокси нет.

Все решения ниже приняты человеком в допросе (grill-me) 20.11.2026. Перед решениями изучены: документация Express 5, Node 24, Vite 8, pino, pino-http, Kubernetes; nodebestpractices; реальные проекты Directus, n8n, Actual Budget, Immich, Hoppscotch, GitLab, Gitea, Grafana, Mastodon, Twenty.

Версии на 20.11.2026 11:10 UTC по [реестру npm](https://registry.npmjs.org/) (`dist-tags`, `time`, `engines`, `peerDependencies`). Карантин Yarn `npmMinimalAgeGate` — 1440 мин (по умолчанию, в `.yarnrc.yml` не задан): ставится последняя версия старше суток. Правило для задач установки: берём последнюю версию, разрешённую карантином в момент установки, и записываем её сюда, если она другая.

| Пакет | Где | Версия | Примечание |
|---|---|---|---|
| express | backend | 5.3.0 | engines `>= 18` |
| @types/express | backend (dev) | 5.0.6 | |
| pg | backend | 8.23.1 | peer `pg-native` необязательный, не ставим |
| @types/pg | backend (dev) | 8.23.1 | |
| pino | backend | 10.4.0 | типы внутри |
| pino-http | backend | 11.0.0 | зависит от `pino ^10`; типы внутри |
| pino-pretty | backend (dev) | 13.2.0 | только в dev (решение 6) |
| helmet | backend | 8.3.0 | типы внутри |
| zod | backend, shared | 4.6.7 | типы внутри |
| supertest | backend (dev) | 7.3.2 | вышел 07.11.2026 |
| @types/supertest | backend (dev) | 7.2.1 | |
| vite | backend (dev) | 8.3.8 | та же, что во `frontend/` и `shared/` |
| vitest | backend (dev) | 5.1.1 | та же, что во `frontend/` и `shared/`; Node `^24.0.0` |
| typescript | backend (dev) | ~7.0.2 | как в остальных пакетах (ADR-0012) |
| @types/node | backend (dev) | ^24 (сейчас 24.19.2) | ветка 24 по `.nvmrc`, `latest` — 26.6.6 |

**Проверка зависимости от TypeScript** (ADR-0012). Ни один пакет из таблицы не зависит от пакета `typescript`: `express`, `pg`, `pino*`, `helmet`, `zod`, `supertest` — JS с типами внутри или в `@types/*`. Vite и Vitest уже работают с TS 7 во `frontend/`.

API сверены через Context7:
- Express — `/expressjs/express/v5.3.0` и `/websites/expressjs`: отклонённый промис из обработчика сам уходит в error-middleware ([migrating to 5](https://expressjs.com/en/guide/migrating-5/)); `req.query` — только getter; graceful shutdown по `SIGTERM` ([health checks and graceful shutdown](https://expressjs.com/en/advanced/healthcheck-graceful-shutdown/)); `helmet` и отключение `X-Powered-By` ([security best practices](https://expressjs.com/en/advanced/best-practice-security/)).
- Node — `/websites/nodejs_latest-v24_x_api`: type stripping «Stability: 2 – Stable» с v24.12.0; расширения в импортах обязательны; `import type` обязателен для типов; `enum`, `namespace` с кодом, parameter properties не поддерживаются; файлы `.ts` внутри `node_modules` Node не обрабатывает. `--env-file-if-exists` стабилен с v24.10.0, переменная окружения главнее значения из файла.
- Vite — `/vitejs/vite/v8.3.5` (тега 8.3.8 нет): `build.ssr` — вход сборки сервера; `ssr.noExternal: true` вшивает все зависимости; при `ssr.target: 'node'` встроенные модули Node остаются внешними; `loadEnv(mode, dir, '')` грузит все переменные без префикса `VITE_`.
- pino-http — `/pinojs/pino-http`: `logger` (родительский pino), `genReqId(req, res)`, `autoLogging.ignore(req)`; импорт `import { pinoHttp } from 'pino-http'`.
- pino — `/pinojs/pino/v10.3.1`: `transport: { target: 'pino-pretty' }` работает в отдельном потоке (worker).

## Goals / Non-Goals

**Goals:**
- `yarn dev` запускает фронт и бэк, `http://127.0.0.1:5173/api/health` отвечает через прокси.
- `yarn build` собирает `backend/dist/server.js`, `node dist/server.js` стартует без `node_modules`.
- Поведение из `specs/api-health` и `specs/api-errors` покрыто тестами на настоящей базе.
- Все проверки (`lint`, `format:check`, `deps`, `typecheck`, `test`, `build`) проходят локально и в CI.

**Non-Goals:**
- Маршруты продукта (схемы, пользователи), таблицы, миграции, ORM.
- Docker-образ бэка и деплой.
- Покрытие тестами сверх сценариев из спек и проверки env.

## Decisions

1. **Структура по фичам** (решение человека; так советуют nodebestpractices и Practica: сначала фичи, а не папки `controllers`/`services` на весь проект). Directus так же отделяет `createApp` от запуска сервера.
   ```
   backend/
     package.json, tsconfig.json, vite.config.ts
     src/
       app.ts                 # createApp({ pool, logger }): middleware, маршруты, 404, ошибки; без listen
       server.ts              # env → logger → pool → createApp → listen; остановка (решение 11)
       config/env.ts          # Zod-схема env, parseEnv(source)
       lib/db.ts              # createPool(url)
       lib/logger.ts          # createLogger({ level, pretty })
       lib/errors.ts          # AppError
       lib/http/not-found.ts      # 404 для /api/*
       lib/http/error-handler.ts  # единый ответ об ошибке (решение 8)
       modules/health/health.router.ts
   ```
   Тесты лежат рядом с кодом (`*.test.ts`), как `shared/src/toolchain.test.ts`. Новая фича — новая папка `src/modules/<фича>/`. Имена файлов — kebab-case, как во `frontend/`.
   - `createApp` получает зависимости аргументом (`pool`, `logger`). Тест передаёт свой `Pool` к `writechart_test` и логгер с уровнем `silent`, без моков и без глобального состояния.

2. **Запуск TS: dev без сборки, прод — сборка Vite** (решение человека, ADR-0014).
   - **dev:** `node --watch --env-file-if-exists=../.env src/server.ts`. Node 24 стирает типы сам, `--watch` перезапускает процесс при правке. Замер на машине человека (тестовый сервер Express + pg + pino): старт `node` ~370 мс, `tsx` ~548 мс.
   - **прод:** `vite build` (в GitHub Actions) → `dist/server.js`. `build.ssr: 'src/server.ts'`, `ssr.noExternal: true` (все пакеты и `shared` внутри), `ssr.target: 'node'`, `build.target: 'node24'`, `outDir: 'dist'`, `sourcemap: true`. Замер: сборка ~130 мс, файл 1,19 МБ, старт из папки без `node_modules` ~195 мс, запросов в секунду столько же, сколько без сборки (~17 500).
   - **start:** `NODE_ENV=production node --enable-source-maps dist/server.js`. Карта исходников нужна, чтобы стек ошибки в логе указывал на `src/*.ts`, а не на строку бандла. `NODE_ENV=...` перед командой понимает переносимая оболочка Yarn (работает и на Windows); задача 4.2 это проверит.
   - **Почему не tsdown, tsx, `tsc`:** tsdown даёт тот же результат (тоже rolldown), но это новый пакет до 1.0; Vite уже стоит. `tsx` медленнее на старте и не нужен, когда Node стирает типы сам. `tsc` в `dist` не собирает `shared` (пакет без сборки, ADR-0007).
   - **Правила кода** (их проверяет `typecheck`, а не прод): импорт своих файлов с `.ts` (`./app.ts`), типы через `import type`, нельзя `enum`, `namespace` с кодом, parameter properties. Vite понимает импорты с `.ts`, поэтому сборка их не ломает.
   - **`shared` под теми же правилами.** Бэк в dev исполняет файлы `shared` через Node (проверено: Node стирает типы в `shared` через симлинк воркспейса, потому что настоящий путь файла вне `node_modules`). Поэтому относительные импорты внутри `shared` тоже пишутся с `.ts`, а в `shared/tsconfig.json` включаются `allowImportingTsExtensions` и `erasableSyntaxOnly`. Фронт (Vite) такие импорты понимает.

3. **TypeScript бэка.** `backend/tsconfig.json` наследует `tsconfig.base.json` и добавляет:
   - `module: nodenext`, `moduleResolution: nodenext` — TS проверяет импорты по правилам Node (расширение обязательно), как советует документация Node. `bundler` из базы пропустил бы импорт без расширения, а Node в dev на нём упадёт;
   - `allowImportingTsExtensions: true` (разрешено, потому что `noEmit` из базы), `erasableSyntaxOnly: true`;
   - `lib: ["ES2024"]`, `types: ["node"]`;
   - `include: ["src", "vite.config.ts"]`.
   - `rewriteRelativeImportExtensions` не нужен: `tsc` ничего не пишет (`noEmit`), JS делает Vite. В сводке допроса он был; исправлено здесь.
   - `typecheck` — `tsc --noEmit`, как в `shared/`.

4. **Переменные окружения** (решение человека). `.env` из корня грузит Node флагом `--env-file-if-exists=../.env` (скрипты Yarn запускаются из папки пакета). Файла нет (CI, прод) — не ошибка, берутся настоящие переменные. `dotenv` не ставим.
   - `src/config/env.ts`: Zod-схема и чистая функция `parseEnv(source)`; `server.ts` вызывает её с `process.env`. При ошибке — по строке на каждую переменную в stderr и `process.exit(1)` (логгера ещё нет, он настраивается из env). Так советуют nodebestpractices: проверить типы, дать значения по умолчанию, упасть сразу.

   | Переменная | Тип | По умолчанию |
   |---|---|---|
   | `NODE_ENV` | `development` \| `production` \| `test` | `development` |
   | `HOST` | строка | `127.0.0.1` (у человека `localhost` уходит на `::1`; на проде в контейнере задают `0.0.0.0`) |
   | `PORT` | целое 1–65535 (`z.coerce`) | `3000` |
   | `DATABASE_URL` | URL `postgres://` или `postgresql://` | обязательна |
   | `LOG_LEVEL` | уровень pino (`fatal`…`trace`, `silent`) | `info` |

   - В корневой `.env.example` без значений добавляются `HOST`, `PORT`, `LOG_LEVEL`, `API_PROXY_TARGET` (решение 12). `DATABASE_URL` и `DATABASE_URL_TEST` там уже есть. `NODE_ENV` задают скрипты, в `.env` он не нужен.

5. **PostgreSQL: `pg` без ORM** (решение человека). `lib/db.ts`: `createPool(url)` → `new Pool({ connectionString, connectionTimeoutMillis: 5000 })`. Таймаут нужен, чтобы `/api/health/ready` при недоступной базе отвечал 503 за секунды, а не ждал бесконечно. Drizzle и Prisma 7 (через `@prisma/adapter-pg`) работают поверх `pg`, так что выбор ORM этот код не ломает.

6. **Логи: pino + pino-http** (решение человека, ADR-0015). Скачивания npm за неделю: pino 81,8 млн, winston 37,5 млн, pino-http 9,8 млн, express-winston 0,7 млн. JSON в stdout, как советует nodebestpractices.
   - `lib/logger.ts`: `createLogger({ level, pretty })`. `pretty: true` → `transport: { target: 'pino-pretty' }`; `server.ts` включает его при `NODE_ENV=development`. На проде (бандл) транспорта нет, только JSON.
   - pino-http: `logger` — общий pino; `genReqId` — берёт `x-request-id`, если он пришёл, иначе `randomUUID()` и ставит заголовок ответа `X-Request-Id` (пример из документации pino-http); `autoLogging.ignore` — пропускает `/api/health` и `/api/health/ready`, чтобы опросы мониторинга не засоряли лог.
   - Код логирует через `req.log` (с id запроса) или общий логгер, не через `console`. Исключение — ошибка env до создания логгера (решение 4).

7. **Middleware** (решение человека). Порядок в `createApp`: `pino-http` → `helmet()` → `express.json()` (лимит по умолчанию 100 КБ) → маршруты под `/api` → 404 → обработчик ошибок. `helmet` убирает `X-Powered-By` и ставит заголовки безопасности.
   - Отложено (решение человека, параметры зависят от решений, которых ещё нет): `trust proxy` и `compression` — к деплою; `express-rate-limit` — к деплою и входу (считает по IP, без правильного `trust proxy` работает неверно); `cookie-parser` — ко входу. CORS не нужен (решение 12).

8. **Ошибки** (решение человека; nodebestpractices: свой класс ошибки, один центральный обработчик, при сбое процесса — выход).
   - `shared/src/api-error.ts`: `ApiError` — Zod-схема `{ error: { code, message, details? } }` и тип из неё. Схема в `shared`, потому что ответ идёт к фронту.
   - `lib/errors.ts`: `AppError extends Error` с полями `status` и `code` — для ожидаемых ошибок в коде.
   - `lib/http/not-found.ts`: всё, что дошло под `/api` и не нашло маршрута, → 404 `not_found`.
   - `lib/http/error-handler.ts` переводит ошибку в ответ:

   | Ошибка | Код | `error.code` |
   |---|---|---|
   | `AppError` | её `status` | её `code` |
   | `ZodError` | 400 | `validation_failed`, `details` — `issues` (путь и текст) |
   | ошибка разбора JSON из `express.json()` (`type: 'entity.parse.failed'`) | 400 | `invalid_json` |
   | тело больше лимита (`type: 'entity.too.large'`) | 413 | `payload_too_large` |
   | всё остальное | 500 | `internal_error`, общий текст; ошибка со стеком — в `req.log.error` |

   - Сбой процесса: `unhandledRejection` и `uncaughtException` → `logger.fatal` и та же остановка, что в решении 11, с кодом выхода 1.

9. **Проверка запросов** (решение человека): `Schema.parse(req.body)` прямо в обработчике. Тип выводится из схемы, `ZodError` уходит в обработчик ошибок (Express 5 сам передаёт исключения из async-обработчиков) → 400. Своего `validate()`-middleware и сторонних библиотек нет: в Express 5 `req.query` только для чтения, а тип из middleware в обработчик не доходит.
   - В каркасе нет маршрута с телом. Ответ 400 проверяет тест на тестовом маршруте, который тест сам добавляет к `createApp` (решение 13).

10. **Health-check** (решение человека; так делают GitLab `/-/liveness`, n8n `/healthz` + `/healthz/readiness`, Directus `/server/ping`; документация Kubernetes: liveness решает о перезапуске, проверка зависимостей — в readiness). Поведение — в `specs/api-health`.
    - `shared/src/health.ts`: схемы `HealthResponse` и `ReadyResponse`.
    - `modules/health/health.router.ts`: `GET /health` и `GET /health/ready` (`pool.query('SELECT 1')`), подключён в `/api`. Ошибка базы пишется в `req.log.warn`, в ответ не попадает.

11. **Мягкая остановка своим кодом** (решение человека; библиотеки http-terminator, close-with-grace, @godaddy/terminus не нужны: Node 24 сам закрывает простаивающие keep-alive соединения в `server.close()`). В `server.ts`: на `SIGTERM`/`SIGINT` → `server.close()` → `pool.end()` → лог → `process.exit(0)`. Таймер 10 с (`unref`): если не успели — лог и `process.exit(1)`. Повторный сигнал во время остановки игнорируется.

12. **Связь с фронтом: прокси Vite** (решение человека; так делают n8n и Immich, CORS у них нет). Фронт ходит на относительный `/api/...`. В `frontend/vite.config.ts`: `server.proxy['/api']` → `env.API_PROXY_TARGET` или `http://127.0.0.1:3000` (`127.0.0.1`, а не `localhost`: у человека `localhost` уходит на `::1`). Переменная берётся через `loadEnv(mode, <корень репозитория>, '')`, поэтому её можно задать в корневом `.env`. Прокси работает только в dev; на проде фронт и `/api` отдаются с одного домена (как именно — решит изменение про деплой).

13. **Тесты** (решение человека; ADR-0009). Vitest + Supertest, настоящая база `writechart_test`.
    - `backend/vite.config.ts`, блок `test`: `environment: 'node'`, `env: loadEnv(mode, <корень>, '')` (Vitest сам `.env` в `process.env` не грузит), `globalSetup` — файл, который до тестов проверяет `DATABASE_URL_TEST` и подключение. Нет переменной или база не отвечает → падение с текстом «скопируй `.env.example` в `.env` и запусти `docker compose up -d`» (решение человека: падать, не пропускать).
    - Тесты:

    | Файл | Что проверяет | База |
    |---|---|---|
    | `config/env.test.ts` | значения по умолчанию, `PORT` из строки, ошибка без `DATABASE_URL`, ошибка на неверный `PORT` | нет |
    | `modules/health/health.test.ts` | `/api/health` → 200; `/api/health/ready` → 200 на `writechart_test`; `ready` → 503 на `Pool` к закрытому порту (`127.0.0.1:1`, `connectionTimeoutMillis: 1000`); `/api/health` → 200 при той же мёртвой базе | да / нет |
    | `app.test.ts` | 404 `not_found`; тестовый маршрут со `Schema.parse` → 400 `validation_failed` с `details`; битый JSON → 400 `invalid_json`; тело > 100 КБ → 413 `payload_too_large`; тестовый маршрут бросает ошибку → 500 `internal_error` без текста ошибки и стека; заголовок `X-Powered-By` отсутствует | нет |

    - Каждый ответ с ошибкой тест разбирает схемой `ApiError` из `shared`, каждый ответ health — схемами из `shared/src/health.ts`. Так тест проверяет и контракт.
    - Чтобы добавить тестовые маршруты, `createApp` принимает необязательный `registerRoutes?: (router) => void`, который подключается в `/api` после основных маршрутов. Так тест не трогает внутренности и не нуждается в моках.
    - Очистка базы между тестами не нужна: таблиц нет. Решим вместе с ORM.
    - Скилл `tdd`: граница теста — HTTP-ответ `createApp`; сначала тест падает, потом проходит.

14. **CI** (решение человека): в задаче `check` сервис `postgres:18` (как в `docker-compose.yml`), `POSTGRES_USER: writechart`, `POSTGRES_PASSWORD: writechart`, `POSTGRES_DB: writechart_test`, порт `5432:5432`, `--health-cmd "pg_isready -U writechart -d writechart_test"`. Сервис стартует до `checkout`, поэтому `init-test-db.sql` не подключить; `POSTGRES_DB` сразу создаёт тестовую базу. На уровне задачи `env: DATABASE_URL_TEST: postgresql://writechart:writechart@localhost:5432/writechart_test`. Пароль не секрет: база живёт внутри раннера, снаружи недоступна. Отдельную CI-задачу для тестов с базой не делаем (решение человека): тест с базой один, второй раннер только замедлит CI.

15. **Скрипты и Turborepo.**
    - `backend/package.json`: `dev` (решение 2), `build` (`vite build`), `start` (решение 2), `typecheck` (`tsc --noEmit`), `test` (`vitest run`).
    - `turbo.json` не меняется: задачи `build` (`outputs: dist/**`), `dev`, `typecheck`, `test` уже есть. Корневой `yarn dev` запустит фронт и бэк вместе.

16. **Oxlint.** В `.oxlintrc.json` override для `backend/**` с `env.node: true`. Проверки по типам подхватят `backend/tsconfig.json`.

17. **ADR и документация** (решение человека: два ADR).
    - `docs/adr/0014-backend-build-and-runtime.md` — запуск TS в dev через Node, сборка Vite для прода, правила кода; варианты: tsdown, tsx, `tsc`, Node без сборки на проде; замеры.
    - `docs/adr/0015-logging-pino.md` — pino + pino-http; варианты: winston, morgan, `console`; цифры скачиваний.
    - Драйвер `pg`, health, ошибки, middleware, прокси — в этом design.
    - `docs/adr/README.md` — две строки в таблице.
    - `docs/architecture.md` — §2 (строки: запуск и сборка бэка, логи, драйвер БД), §3 (`backend/`), §5 (Supertest и база в тестах установлены), §6 (сервис Postgres в CI, убрать из «Позже»), §7 (отложенное, список ниже).
    - `AGENTS.md` — убрать Supertest из «Решено, но пока не установлено»; `yarn test` требует `docker compose up -d`.
    - `backend/AGENTS.md` — структура, правила импортов `.ts` и без `enum`, `Schema.parse` в обработчике, ошибки через `AppError`, логи через `req.log`, где тесты и что нужна база.
    - `shared/AGENTS.md` — относительные импорты с `.ts`, без `enum` (решение 2).

**Отложено** (записать в `docs/architecture.md` §7 с привязкой):
- `trust proxy`, `compression` → изменение про деплой;
- `express-rate-limit` → деплой и вход;
- `cookie-parser` → вход;
- как прод отдаёт фронт и `/api` (nginx или Express), Docker-образ бэка → деплой;
- отдельная CI-задача для тестов с базой → когда тесты с базой станут заметно тормозить CI;
- очистка базы между тестами, миграции → вместе с ORM.

## Risks / Trade-offs

- [Type stripping в Node — свежая фича, крупные проекты на нём прод не гоняют] → у нас он только в dev; прод работает на бандле Vite. Если в dev что-то не заработает — можно перейти на `tsx` без правки кода.
- [`vite build` вшивает пакет, который так не работает (динамический `require`, файлы рядом с модулем)] → замер на Express + pg + pino прошёл. Задача 4.2 запускает собранный `dist/server.js` из пустой папки и проверяет `/api/health/ready`. Если пакет ломается в бандле — выносим его в `ssr.external` и записываем сюда.
- [pino-pretty в бандле] → не попадает: транспорт включается только при `NODE_ENV=development`, а бандл запускается с `production`.
- [`NODE_ENV=...` в скрипте `start` на Windows] → переносимая оболочка Yarn понимает такую запись; задача 4.2 проверит. Если нет — задаём `NODE_ENV` в `vite.config.ts` через `define`.
- [`localhost` в `DATABASE_URL` из `.env.example` у человека уходит на `::1`] → задача 2.3 проверяет подключение к Docker-базе. Если не работает — в `.env.example` меняем `localhost` на `127.0.0.1`.
- [knip и строковый транспорт `pino-pretty`, `globalSetup` в конфиге Vitest] → knip может не увидеть их. Задача 7.1 запускает `yarn deps`; если knip ошибается, правим его конфиг, проверку не отключаем.
- [`module: nodenext` в бэке и `bundler` в `shared`] → `shared` проверяется своим tsconfig, бэк проверяет импорты `shared` по `exports` (`./*` → `./src/*.ts`). Задача 3.1 проверяет `typecheck` на импорте из `@writechart/shared/health`.
- [Supertest 7.3.2 вышел 07.11.2026] → свежий выпуск. Используем базовые `request(app).get/post`. Если что-то сломается — откат на 7.3.1.
- [Время CI] → старт контейнера Postgres (~10–20 с) и сборка бэка. Сколько точно — станет видно по первому запуску.

## Open Questions

Нет.
