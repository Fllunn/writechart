# Tasks

## 1. Пакеты и TypeScript

- [x] 1.1 Поставить `zod` в `shared/` (версия из таблицы в design; на карантине — последняя разрешённая, отметить в design); в `shared/tsconfig.json` включить `allowImportingTsExtensions` и `erasableSyntaxOnly`; в `shared/AGENTS.md` дописать правило: относительные импорты с `.ts`, без `enum` и `namespace` (design, решение 2); проверить: `yarn workspace @writechart/shared typecheck` и `test` проходят
- [x] 1.2 Поставить в `backend/` зависимости `express`, `pg`, `pino`, `pino-http`, `helmet`, `zod`, `@writechart/shared` (`workspace:*`) и dev-зависимости `typescript`, `@types/node`, `@types/express`, `@types/pg`, `@types/supertest`, `supertest`, `pino-pretty`, `vite`, `vitest` (версии из таблицы в design; на карантине — последняя разрешённая, отметить в design); проверить: `yarn install` без ошибок, версии в `backend/package.json` совпадают с design
- [x] 1.3 Создать `backend/tsconfig.json` (design, решение 3), скрипт `typecheck` в `backend/package.json`, override `env.node` для `backend/**` в `.oxlintrc.json` (решение 16); в `backend/AGENTS.md` записать правила кода: импорты своих файлов с `.ts`, `import type` для типов, без `enum`/`namespace`/parameter properties (решение 2); проверить: временный файл с импортом без расширения даёт ошибку `typecheck`, с `enum` — тоже; временный файл удалён; `yarn lint` проходит

## 2. Env, логи, база, запуск

- [x] 2.1 Написать `src/config/env.ts` (`parseEnv`) и `src/config/env.test.ts` (design, решение 4; таблица тестов, решение 13; скилл `tdd`: сначала тест падает); дописать `HOST`, `PORT`, `LOG_LEVEL`, `API_PROXY_TARGET` без значений в корневой `.env.example`; проверить: тест проходит, а без `DATABASE_URL` и с `PORT=abc` `parseEnv` возвращает ошибку по этой переменной
- [x] 2.2 Написать `src/lib/logger.ts` и `src/lib/db.ts` (решения 5, 6); написать `docs/adr/0015-logging-pino.md` и строку в `docs/adr/README.md` (решение 17); проверить: `yarn typecheck` проходит, ADR в формате Контекст → Решение → Варианты → Последствия
- [x] 2.3 Написать `src/app.ts` (`createApp({ pool, logger, registerRoutes? })` с `pino-http`, `helmet`, `express.json()`, роутером `/api`; решения 1, 6, 7, 13) и `src/server.ts` (env → logger → pool → `listen` на `HOST:PORT`); скрипт `dev` (решение 2); в `backend/AGENTS.md` — структура `src/` и логи через `req.log` (решения 1, 6); проверить: при запущенном `docker compose up -d` команда `yarn workspace @writechart/backend dev` пишет в лог цветную строку о старте; правка файла перезапускает сервер; без `DATABASE_URL` процесс выходит с кодом 1 и строкой про эту переменную; подключение к базе по `DATABASE_URL` из `.env` работает (если `localhost` не работает — поменять на `127.0.0.1` в `.env.example` и записать в design)
- [x] 2.4 Добавить в `server.ts` мягкую остановку и обработку `unhandledRejection`/`uncaughtException` (решения 8, 11); проверить: Ctrl+C в `dev` пишет в лог остановку и процесс выходит с кодом 0; временный `setTimeout(() => Promise.reject(new Error('x')))` даёт `fatal` в логе и код выхода 1; временный код удалён

## 3. Health и ошибки

- [x] 3.1 Написать в `shared/src/` схемы `api-error.ts` (`ApiError`) и `health.ts` (`HealthResponse`, `ReadyResponse`) с типами через `z.infer` (решения 8, 10; `shared/AGENTS.md`); проверить: `yarn typecheck` проходит в `shared/` и в `backend/` на временном импорте `@writechart/shared/health`; `node` в `backend/` запускает файл с этим импортом
- [x] 3.2 Добавить в `backend/vite.config.ts` блок `test` (`environment: 'node'`, `env` через `loadEnv` из корня, `globalSetup` с проверкой `DATABASE_URL_TEST` и подключения) и скрипт `test` (решение 13); проверить: при остановленном Docker `yarn workspace @writechart/backend test` падает с текстом про `.env.example` и `docker compose up -d`; при запущенном — проходит
- [x] 3.3 Написать `src/modules/health/health.router.ts` и `health.test.ts` по `specs/api-health` (решения 10, 13; скилл `tdd`); проверить: все сценарии `specs/api-health` покрыты тестами и проходят; ответы разбираются схемами из `shared/src/health.ts`; запросы к `/api/health*` не пишутся в лог (решение 6)
- [x] 3.4 Написать `src/lib/errors.ts`, `src/lib/http/not-found.ts`, `src/lib/http/error-handler.ts` и `src/app.test.ts` по `specs/api-errors` (решения 8, 9, 13; скилл `tdd`); в `backend/AGENTS.md` — `Schema.parse` в обработчике, ошибки через `AppError`, где тесты и что нужна база; в `AGENTS.md` — убрать Supertest из «Решено, но пока не установлено», дописать, что `yarn test` требует `docker compose up -d`; в `docs/architecture.md` §5 — Supertest и база в тестах установлены (решение 17); проверить: все сценарии `specs/api-errors` покрыты тестами и проходят; каждый ответ с ошибкой разбирается схемой `ApiError`; в ответе 500 нет текста ошибки и стека; `X-Powered-By` нет

## 4. Сборка

- [x] 4.1 Добавить в `backend/vite.config.ts` сборку сервера (`build.ssr`, `ssr.noExternal: true`, `ssr.target: 'node'`, `build.target: 'node24'`, `sourcemap`) и скрипты `build`, `start` (решения 2, 15); проверить: `yarn build` создаёт `backend/dist/server.js` и `frontend/dist/index.html`
- [x] 4.2 Скопировать `backend/dist/` в пустую папку вне репозитория (без `node_modules`) и запустить `NODE_ENV=production node --enable-source-maps server.js` с `DATABASE_URL`; отдельно проверить `yarn workspace @writechart/backend start` (решение 2); проверить: `/api/health/ready` → 200, лог — JSON без цветов, ошибка в обработчике показывает в стеке путь `src/*.ts`; `NODE_ENV=production` в скрипте `start` срабатывает в Yarn на Windows (если нет — `define` в `vite.config.ts`, записать в design)
- [x] 4.3 Написать `docs/adr/0014-backend-build-and-runtime.md` и строку в `docs/adr/README.md`; в `docs/architecture.md` §2 добавить строки «запуск и сборка бэка», «логи», «драйвер БД», в §3 — `backend/` (решение 17); проверить: ADR в формате Контекст → Решение → Варианты → Последствия, цифры замеров совпадают с design

## 5. Прокси с фронта

- [x] 5.1 Добавить в `frontend/vite.config.ts` `server.proxy['/api']` на `API_PROXY_TARGET` или `http://127.0.0.1:3000` через `loadEnv` из корня (решение 12); проверить: при `yarn dev` (фронт с `--host 127.0.0.1`) запрос `http://127.0.0.1:5173/api/health` → 200 `{ "status": "ok" }`; `yarn workspace @writechart/frontend test` проходит

## 6. CI

- [x] 6.1 Добавить в задачу `check` в `.github/workflows/ci.yml` сервис `postgres:18` и `env.DATABASE_URL_TEST` (решение 14); в `docs/architecture.md` §6 — сервис Postgres (убрать из «Позже»), §7 — отложенное из design (решение 17); проверить: `yarn format:check` проходит, имя пользователя, пароль, база и порт в `ci.yml` совпадают с `DATABASE_URL_TEST`

## 7. Проверка локально

- [x] 7.1 Прогнать `yarn lint`, `yarn format:check`, `yarn deps`, `yarn typecheck`, `yarn test`, `yarn build` и `yarn openspec validate setup-backend-scaffold` (если knip ошибается на `pino-pretty` или `globalSetup` — правим конфиг knip, проверку не отключаем; design, риски); проверить: всё без ошибок
- [x] 7.2 Запустить `/code-review` по изменениям ветки против `master` и `openspec/changes/setup-backend-scaffold/`; проверить: найденные ошибки показаны человеку, исправлены только с его согласия, после исправлений 7.1 проходит снова

## 8. Проверка на GitHub (человек)

- [x] 8.1 Человек пушит ветку и открывает PR; проверить: `CI / check` зелёная, в логе стартовал сервис Postgres, `yarn test` прогнал тест `/api/health/ready` на базе, `yarn build` собрал `backend/dist/server.js`

## Workflow follow-up

- После ревью и зелёного CI, перед слиянием: `/opsx:archive setup-backend-scaffold` в этой же ветке; человек коммитит архив последним коммитом и сливает PR.
