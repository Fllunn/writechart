# Tasks

## 1. Пакет и TypeScript

- [x] 1.1 Добавить `"e2e"` в `workspaces` корневого `package.json`; создать `e2e/package.json` (`@writechart/e2e`, `private`, `type: module`) и поставить `@playwright/test`, `typescript`, `@types/node` в `devDependencies`, `@writechart/frontend`, `@writechart/backend`, `@writechart/shared` (`workspace:*`) в `dependencies` (версии из таблицы в design; на карантине — последняя разрешённая, отметить в design); проверить: `yarn install` без ошибок, версии в `e2e/package.json` совпадают с design, в `yarn.lock` нет пакета `typescript` в зависимостях `playwright*` (`yarn why typescript` показывает только наши пакеты)
- [x] 1.2 Создать `e2e/tsconfig.json` и скрипт `typecheck` (`tsc --noEmit`), добавить override `env.node` для `e2e/**` в `.oxlintrc.json` (design, решение 11); проверить: `yarn typecheck` проходит и запускает `typecheck` в `@writechart/e2e`; `yarn lint` проходит

## 2. Конфиг Playwright и запуск

- [x] 2.1 Написать `e2e/playwright.config.ts`: чтение `<корень>/.env` через `util.parseEnv` с приоритетом `process.env` и ошибка с подсказкой без `DATABASE_URL_TEST` (решение 4); `webServer` из двух серверов на 3100 и 4173 с `reuseExistingServer: false` (решения 2, 3); `baseURL`, проект `chromium` (решение 5); `retries`, `trace`, `forbidOnly` (решение 6); `reporter` (решение 8); проверить: `yarn workspace @writechart/e2e playwright test --list` без `.env` и без переменной падает с подсказкой про `.env.example` и `docker compose up -d`; с `.env` — выводит список (пока пустой)
- [x] 2.2 Добавить задачу `e2e` в `turbo.json` и скрипты `e2e` в корень и в `e2e/package.json` (решение 9); скачать браузер `yarn workspace @writechart/e2e playwright install chromium --only-shell`; написать `e2e/AGENTS.md`, в `AGENTS.md` — строка `e2e/` в таблице пакетов, Playwright в «Инструменты» (убрать из «Решено, но пока не установлено»), команды `yarn e2e` и установки браузера, `yarn e2e` в списке «перед готово» (решение 12); проверить: `yarn e2e` собирает фронт и бэк (видно в выводе turbo), поднимает оба сервера и завершается; после выхода `netstat -ano` не показывает слушателей на 4173 и 3100 (design, риски); `turbo run e2e --dry=json` показывает `^build` и `DATABASE_URL_TEST`; команды в `AGENTS.md` совпадают со скриптами

## 3. Тесты

- [x] 3.1 Написать `e2e/tests/home.spec.ts` (решение 7; скилл `tdd`: сначала тест падает на другом имени заголовка, потом проходит); проверить: `yarn e2e` проходит; при временно другом ожидаемом имени тест падает, в `e2e/playwright-report/` есть отчёт; временная правка удалена
- [x] 3.2 Написать `e2e/tests/api-health.spec.ts`: `GET /api/health/ready` через `baseURL` фронта, тело разбирается `ReadyResponse` из `@writechart/shared/health` (решение 7; скилл `tdd`: при остановленном Docker тест падает на 503, при запущенном проходит); в `docs/architecture.md` §3 — `e2e/`, §5 — Playwright установлен; в `frontend/AGENTS.md` — ссылка на `e2e/` вместо «Playwright появится позже» (решение 12); проверить: `yarn e2e` проходит (значит, `vite preview` проксирует `/api` на 3100 и Playwright понимает импорты `.ts` в `shared`); `yarn typecheck` проходит

## 4. Линтер и CI

- [x] 4.1 Проверить, что Oxlint ловит забытый `await` (решение 11): временный тест с `expect(page.getByRole('heading')).toBeVisible()` без `await`; проверить: `yarn lint` падает на `typescript/no-floating-promises`; временный файл удалён, `yarn lint` проходит (если не ловит — остановиться и сообщить человеку)
- [x] 4.2 Добавить в `.github/workflows/ci.yml` задачу `e2e` (сервис `postgres:18`, `env.DATABASE_URL_TEST`, установка браузера `--with-deps chromium --only-shell`, `yarn e2e`, артефакт `e2e/playwright-report/` при `failure()` на 14 дней; решение 10); в `docs/architecture.md` §6 — задача `e2e`, обязательные проверки `check` и `e2e`, убрать Playwright из «Позже» (решение 12); проверить: `yarn format:check` проходит; сервис, пользователь, пароль, база и порт совпадают с задачей `check`; команды в `ci.yml` совпадают со скриптами корня

## 5. Проверка локально

- [x] 5.1 Прогнать `yarn lint`, `yarn format:check`, `yarn deps`, `yarn typecheck`, `yarn test`, `yarn build`, `yarn e2e` и `yarn openspec validate setup-e2e-playwright` (если knip ошибается на конфиге Playwright — правим конфиг knip, проверку не отключаем; design, риски); проверить: всё без ошибок
- [x] 5.2 Запустить `/code-review` по изменениям ветки против `master` и `openspec/changes/setup-e2e-playwright/`; проверить: найденные ошибки показаны человеку, исправлены только с его согласия, после исправлений 5.1 проходит снова
- [x] 5.3 Записать в корневой `AGENTS.md` раздел «Секреты»: `.env` и файлы с секретами агент не переносит, не переименовывает, не копирует и не правит; проверки без файла — переменными окружения; при нужде в базе — временный ресурс с тестовыми значениями или проверка человеком (решение человека после потери `.env`, design, риски); проверить: `yarn format:check` проходит, раздел стоит в `AGENTS.md`, `CLAUDE.md` ссылается на `AGENTS.md`
- [x] 5.4 После первого запуска у человека (503 без причины, нет браузера, WASI при сборке): `stdout: "pipe"` у бэка в `playwright.config.ts` и строка про лог `[backend]` в `e2e/AGENTS.md`; подсказка про занятый 5432 в `.env.example`; починить `@tailwindcss/oxide-win32-x64-msvc` в `node_modules` (design, решение 2 и риски; решение человека «разберись и исправь»); проверить: с мёртвой базой в выводе есть `[backend]` и `Database is not ready`, на живой базе 2 теста проходят и лог пуст; сборка фронта без `WASI`; проверки 5.1 проходят

## 6. Проверка на GitHub (человек)

- [ ] 6.1 Человек пушит ветку и открывает PR; проверить: зелёные `CI / check` и `CI / e2e`; в логе `e2e` поставлен Chromium headless shell и `yarn e2e` прогнал 2 теста; время шагов установки браузера и E2E записано в design
- [ ] 6.2 Человек добавляет `e2e` в обязательные проверки правила защиты `master` (Settings → Branches); проверить: в PR `e2e` помечена как Required

## Workflow follow-up

- После ревью и зелёного CI, перед слиянием: `/opsx:archive setup-e2e-playwright` в этой же ветке; человек коммитит архив последним коммитом и сливает PR.
