# Design

## Context

Монорепо: `frontend/` (Vite 8, `vite preview` отдаёт `dist/`), `backend/` (`yarn build` → `dist/server.js`, `start` = `NODE_ENV=production node --enable-source-maps dist/server.js`; env только из процесса, `.env` в `start` не читается), `shared/` (Zod-схемы, `ReadyResponse` в `shared/src/health.ts`). Turborepo 2.11.13 в строгом режиме env. У `test` — `env: ["DATABASE_URL_TEST"]`. CI: одна задача `check` (47 с на `master` 20.11.2026: Postgres 13 с, `setup-node` 4 с, `yarn install` 9 с, `build` 2 с) с сервисом `postgres:18`. Фронт ходит на относительный `/api`; прокси — `server.proxy['/api']` на `env.API_PROXY_TARGET` (через `loadEnv(mode, <корень>, '')`) или `http://127.0.0.1:3000`. В `.gitignore` уже есть `playwright-report/` и `test-results/`.

Все решения ниже приняты человеком в допросе 20.11.2026. Перед решениями изучены: документация Playwright 1.64.1 (Context7: webServer, CI, TypeScript), Vite 8 (`preview`, `loadEnv`), Turborepo 2 (гайд Playwright, строгий env), Node 24 (`util.parseEnv`); `playwright.config.ts` Immich, Twenty, Actual, Cal.com; CI Immich, Actual, Twenty.

Версии на 20.11.2026 14:30 UTC по [реестру npm](https://registry.npmjs.org/). Карантин Yarn `npmMinimalAgeGate` 1440 мин: ставится последняя версия старше суток. Правило для задачи 1.1: берём последнюю версию, разрешённую карантином в момент установки, и записываем её сюда, если она другая.

| Пакет | Версия | Примечание |
|---|---|---|
| @playwright/test | 1.65.1 | вышел 13.11.2026; engines `node >=20`; Chromium 159.0.8154.6 (`browsers.json`) |
| typescript | ~7.0.2 | как в остальных пакетах (ADR-0012) |
| @types/node | ^24 | для `playwright.config.ts` (`node:util`, `node:fs`) |
| @writechart/frontend, @writechart/backend | `workspace:*` | граф задач turbo (решение 4), кода из них не импортируем |
| @writechart/shared | `workspace:*` | схема `ReadyResponse` в тесте |

**Проверка зависимости от TypeScript** (ADR-0012). `@playwright/test` → `playwright` → `playwright-core`, у `playwright-core` зависимостей нет. Пакета `typescript` в цепочке нет: TS-файлы Playwright переводит своим встроенным транспилятором и типы не проверяет ([TypeScript](https://playwright.dev/docs/test-typescript)). Из `tsconfig` он читает только `paths`, `baseUrl`, `jsx*`, `allowJs`, `references`, `extends`. Типы проверяет наш `tsc` (TS 7).

## Goals / Non-Goals

**Goals:**
- `yarn e2e` локально и задача `e2e` в CI собирают фронт и бэк, поднимают их на своих портах с базой `writechart_test` и проходят оба теста.
- Падение E2E в CI видно по имени задачи, аннотацией в PR и HTML-отчётом с trace в артефакте.
- `yarn lint`, `typecheck`, `deps`, `format:check` покрывают `e2e/`.

**Non-Goals:**
- Изоляция данных между Vitest бэка и E2E: таблиц нет; решим вместе с ORM и очисткой базы.
- Визуальные сравнения (`toHaveScreenshot`), шардинг, `blob`-репортёр.
- Запуск E2E против dev-серверов.

## Decisions

1. **Пакет `e2e/`** (решение человека). Корень `workspaces` получает `"e2e"`. Так советует [гайд Turborepo](https://turborepo.com/docs/guides/tools/playwright) («пакет на каждый набор тестов») и так сделано в Immich (`e2e/`) и Twenty (`packages/twenty-e2e-testing`). Варианты: `frontend/e2e/` (Actual) — фронт начал бы тянуть бэк и базу; корень (Cal.com, Grafana) — зависимость в корне, против правила `AGENTS.md`, и turbo не видит задачу.
   ```
   e2e/
     package.json        # @writechart/e2e, type: module, скрипты e2e, typecheck
     playwright.config.ts
     tsconfig.json
     AGENTS.md
     tests/
       home.spec.ts      # заголовок главной
       api-health.spec.ts  # /api/health/ready через фронт
   ```
   Имена файлов — kebab-case, как в остальных пакетах. Суффикс `.spec.ts` — значение `testMatch` Playwright по умолчанию тоже ловит его; Vitest в `e2e/` нет, путаницы нет.

2. **Весь стек на сборке** (решения человека: фронт + бэк + база; сборка, а не dev). `webServer` — массив из двух серверов ([multiple web servers](https://playwright.dev/docs/test-webserver#multiple-web-servers)); при массиве `use.baseURL` задаётся явно.

   | Сервер | `command` | `url` (ждём готовности) | env |
   |---|---|---|---|
   | бэк | `yarn workspace @writechart/backend start` | `http://127.0.0.1:3100/api/health` | `HOST=127.0.0.1`, `PORT=3100`, `DATABASE_URL` = `DATABASE_URL_TEST`, `LOG_LEVEL=warn` |
   | фронт | `yarn workspace @writechart/frontend preview --host 127.0.0.1 --port 4173 --strictPort` | `http://127.0.0.1:4173` | `API_PROXY_TARGET=http://127.0.0.1:3100` |

   - `use.baseURL: 'http://127.0.0.1:4173'`. `127.0.0.1`, а не `localhost`: у человека `localhost` уходит на `::1`.
   - У бэка `stdout: "pipe"` (по умолчанию Playwright выкидывает stdout): при 503 от `/api/health/ready` в выводе теста видна строка pino `Database is not ready` с ошибкой базы. При `LOG_LEVEL=warn` в успешном прогоне лог пуст. Добавлено после первого запуска у человека, где 503 был без причины (решение человека «разберись и исправь», 20.11.2026).
   - Бэк ждём по `/api/health` (живость, без базы). Базу проверяет сам тест (решение 7), так что падение базы — это красный тест с понятным текстом, а не таймаут старта.
   - `preview.proxy` по умолчанию берёт `server.proxy` ([preview options](https://vite.dev/config/preview-options#preview-proxy)), `loadEnv` отдаёт переменной процесса приоритет над `.env` ([env and mode](https://vite.dev/guide/env-and-mode)). Поэтому правок в `frontend/vite.config.ts` и `backend/` нет.
   - `env` в `webServer` — только свои переменные: Playwright 1.65.1 сам сливает `{ ...process.env, ...env }` (проверено по коду `playwright/lib/runner`, задача 2.1).
   - Почему сборка: тест видит то, что уйдёт на прод, и ловит ошибки бандла. Сборка фронта и бэка без кэша идёт 1,5 с (`turbo run build --force`, замер 20.11.2026). Так делают Cal.com (`start`), Immich (Docker-сборка), Actual в CI (`E2E_USE_BUILD`).

3. **Порты 4173 и 3100, `reuseExistingServer: false`** (решение человека). Dev занимает 5173 и 3000. Если бы E2E шёл на тех же портах с `reuseExistingServer: !CI` (пример документации), он взял бы dev-бэк, а тот ходит в рабочую базу `writechart`. Свои порты держат Actual (E2E 3001, dev 3000) и Immich (E2E 2285, dev 2283). Занятый порт → ошибка сразу (`--strictPort` у Vite, `reuseExistingServer: false` у Playwright), без тихого сдвига на соседний порт.

4. **База `writechart_test`** (решение человека). Адрес — из `DATABASE_URL_TEST`; бэк получает его как `DATABASE_URL`. Таблиц нет, поэтому Vitest бэка и E2E друг другу не мешают. Отдельная база (`writechart_e2e`) потребовала бы шаг `createdb` в CI и строку в `init-test-db.sql` — отложено вместе с очисткой базы до ORM.
   - **Откуда `DATABASE_URL_TEST` локально.** Playwright `.env` не читает. В `playwright.config.ts`: если есть `<корень>/.env`, его содержимое разбирает `util.parseEnv` (Node 24, без пакета `dotenv`), а `process.env` главнее файла — так же, как у `node --env-file` и `loadEnv` Vite. В CI файла нет, берётся `env` задачи. Нет переменной → конфиг бросает ошибку с подсказкой «скопируй `.env.example` в `.env` и запусти `docker compose up -d`», как `test-global-setup.ts` бэка.
   - Чтение файла turbo не фильтрует: строгий env касается только переменных процесса.

5. **Только Chromium, headless shell** (решение человека). Один проект `chromium` с `devices['Desktop Chrome']`. Скачивание для Linux (CDN, Playwright 1.65.1): headless shell 126 МБ, полный Chromium 199 МБ, Firefox 113 МБ, WebKit 101 МБ. Все пять изученных проектов (Immich, Twenty, Actual, Cal.com, Grafana) гоняют только Chromium. Второй движок добавляется строкой в `projects`, если редактор схем начнёт вести себя по-разному.

6. **Повторы, trace, `forbidOnly`** (решение человека: как шаблон `npm init playwright`). `retries: CI ? 2 : 0`, `use.trace: 'on-first-retry'`, `forbidOnly: !!process.env.CI`. Остальное по умолчанию (`workers`, таймауты). Сравнение: Immich `retries` 4, Twenty 2, Actual 1, Cal.com 2; trace `on-first-retry` у Immich и Actual, `retain-on-failure` у Twenty.

7. **Два теста** (решение человека). Скилл `tdd`: граница теста — то, что видит пользователь или клиент HTTP, а не внутренности.
   - `home.spec.ts`: `page.goto('/')` → `await expect(page.getByRole('heading', { name: 'Writechart' })).toBeVisible()`.
   - `api-health.spec.ts`: фикстура `request` (HTTP без браузера, по `baseURL`) → `GET /api/health/ready` на адрес **фронта** → статус 200, тело разбирается `ReadyResponse` из `@writechart/shared/health` и равно `{ status: 'ok', db: 'ok' }`. Это проверяет цепочку: сборка фронта → прокси `vite preview` → сборка бэка → база.
   - Цикл red → green: каждый тест сначала падает (другой заголовок; бэк без базы → 503), потом проходит.

8. **Отчёты** (решение человека). `reporter`: в CI `[['github'], ['html', { open: 'never' }]]`, локально `[['list'], ['html', { open: 'never' }]]`. Отчёт локально открывают сами: `yarn workspace @writechart/e2e playwright show-report`. `github` ставит аннотацию на строку упавшего теста в PR.

9. **Turborepo** (решения человека: своя задача `e2e`, кэш как у `test`). По [гайду Turborepo](https://turborepo.com/docs/guides/tools/playwright):
   ```json
   "e2e": {
     "dependsOn": ["^build"],
     "env": ["DATABASE_URL_TEST"],
     "passThroughEnv": ["PLAYWRIGHT_*"],
     "outputs": []
   }
   ```
   - `^build` + зависимости `@writechart/frontend` и `@writechart/backend` в `e2e/package.json` → turbo сам собирает оба пакета перед E2E и промахивается мимо кэша при правке их кода.
   - `CI`, `PATH`, `LOCALAPPDATA` (там браузеры Playwright на Windows) turbo пропускает сам ([встроенный список](https://github.com/vercel/turborepo/blob/main/crates/turborepo-env/src/lib.rs)).
   - Кэш: при прошедшем E2E и неизменном коде повторный `yarn e2e` отвечает из кэша. Упавшие задачи turbo не кэширует. `yarn e2e --force` гонит заново. В CI кэша turbo нет.
   - Корень: `"e2e": "turbo run e2e"`. `e2e/package.json`: `"e2e": "playwright test"`, `"typecheck": "tsc --noEmit"`. Скрипта `test` в `e2e/` нет, поэтому `yarn test` остаётся быстрым.

10. **CI: своя задача `e2e`** (решения человека). В `ci.yml` вторая задача рядом с `check`, без `needs`: идут параллельно.
    - Тот же сервис `postgres:18` и `env.DATABASE_URL_TEST`, что в `check`.
    - Шаги: `checkout` → `corepack enable` → `setup-node` (`.nvmrc`, кэш Yarn) → `yarn install --immutable` → `yarn workspace @writechart/e2e playwright install --with-deps chromium --only-shell` → `yarn e2e` → `actions/upload-artifact@v7` с `e2e/playwright-report/`, `if: failure()`, `retention-days: 14`.
    - Браузер ставит команда, а не Docker-образ `mcr.microsoft.com/playwright:v1.65.1-noble` (решение человека): образ 966 МБ в сжатом виде (все три браузера), его версию надо поднимать руками вместе с пакетом, а в контейнере Postgres доступен по имени `postgres`, а не `localhost`. Команда берёт версию браузера из установленного `@playwright/test`.
    - Кэш браузеров не делаем: по [документации Playwright](https://playwright.dev/docs/ci#caching-browsers) восстановление кэша занимает столько же, сколько скачивание, а системные пакеты Linux в кэш не попадают.
    - Цена: подготовка задачи (~28 с) идёт дважды; время до зелёной галочки ≈ max(`check`, `e2e`). Реальные проекты держат E2E отдельной задачей: Immich (`e2e-tests-*`), Actual (`functional`), Twenty (`ci-e2e-main.yaml`).
    - Человек добавляет проверку `e2e` в правила защиты `master` на GitHub (задача 6.2).

11. **TypeScript и линтер** (решение человека: Oxlint как есть).
    - `e2e/tsconfig.json`: наследует `tsconfig.base.json`, `lib: ["ES2024", "DOM"]` (типы `page` используют DOM), `types: ["node"]`, `allowImportingTsExtensions: true` (файлы `shared` импортируют `./*.ts`), `include: ["playwright.config.ts", "tests"]`.
    - `.oxlintrc.json`: override `env.node` для `e2e/**`. `typescript/no-floating-promises` (категория `correctness`, по типам) уже ловит забытый `await` у `expect` и действий страницы; `test.only` ловит `forbidOnly` в CI. Плагина Playwright в Oxlint 1.94 нет; `eslint-plugin-playwright` 2.12.2 требует peer `eslint >=8.40` и экспериментальные JS-плагины Oxlint — не берём.
    - knip: воркспейс `e2e` подхватывается сам, `playwright.config.ts` и тесты knip находит своим плагином Playwright.

12. **Документация** (решение человека: без ADR, Playwright уже в ADR-0009).
    - `AGENTS.md`: убрать Playwright из «Решено, но пока не установлено» и из «Инструменты» дописать; в «Команды» — `yarn e2e` и разовая `yarn workspace @writechart/e2e playwright install chromium --only-shell`; `yarn e2e` в список «перед готово» (решение человека); таблица пакетов — строка `e2e/`.
    - `e2e/AGENTS.md`: что здесь, как запускать, порты и база, правила (тесты только через UI и HTTP, без импорта кода `frontend/` и `backend/`, `await` у каждого `expect` и действия, схемы ответов — из `shared`), где отчёт.
    - `frontend/AGENTS.md`: фраза «Playwright для главных сценариев появится позже» → ссылка на `e2e/`.
    - `docs/architecture.md`: §3 структура (`e2e/`), §5 (Playwright установлен), §6 (задача `e2e`, обязательные проверки `check` и `e2e`, убрать Playwright из «Позже»).

13. **Скиллы проекта при реализации:** `tdd` (задачи 3.1, 3.2), `playwright-cli` (отладка тестов, если упадут).

## Risks / Trade-offs

- [Случилось при реализации 20.11.2026: проверяя конфиг «без `.env`», агент перенёс `.env` через `AppData\Local`; песочница Claude Code (AppContainer) зашифровала его EFS своим ключом, `cipher /d` не помог, человек пересоздал файл из `.env.example`] → правило «Секреты» в корневом `AGENTS.md` (решение человека): `.env` не трогать, проверки без файла — переменными окружения. Задача 5.3.
- [Разбор после первого запуска у человека, 20.11.2026] Причины сбоев были на машине, не в коде E2E:
  - у `C:\Users\1\AppData\Local` стоит флаг EFS `Encrypted`: файлы, созданные там песочницей агента, зашифрованы её ключом. Отсюда потерянный `.env` и Chromium в `ms-playwright`, который процесс человека не видит (`Executable doesn't exist`). Браузер человек ставит сам; агент для своих прогонов берёт свой путь (`PLAYWRIGHT_BROWSERS_PATH`) или уже стоящий;
  - в `node_modules/@tailwindcss/oxide-win32-x64-msvc` (установка 14:21, до этого изменения) не было `package.json`, Tailwind уходил на WASM — предупреждение `WASI is an experimental feature` при сборке. Папка удалена и связана заново `yarn install`, `yarn.lock` не изменился;
  - на 5432 слушают и служба Windows `postgres.exe`, и Docker; соединение уходит то туда, то туда → 503. В `.env.example` добавлена подсказка: при своём PostgreSQL на 5432 ставить 5433 в `POSTGRES_PORT` и оба URL. Задача 5.4.

- [Playwright на Windows не шлёт `SIGTERM` дочерним серверам (`gracefulShutdown` игнорируется) и убивает дерево процессов; у человека `TaskStop` уже оставлял живой дочерний `node`] → задача 2.2 после `yarn e2e` проверяет `netstat -ano`: порты 4173 и 3100 свободны. Если нет — записываем сюда и ищем способ (например, `wait` и явная остановка).
- [`vite preview` не возьмёт `API_PROXY_TARGET` из процесса или не унаследует `server.proxy`] → по документации Vite обе вещи работают; задача 3.2 это и проверяет. Если нет — правка `frontend/vite.config.ts` с согласия человека, запись сюда.
- [Playwright не поймёт импорты `./*.ts` внутри `shared` при транспиляции] → настоящий путь `shared` вне `node_modules`, Playwright транспилирует такие файлы. Задача 3.2 проверяет. Если нет — спросить человека.
- [`util.parseEnv` не разберёт `.env`] → формат тот же, что у `--env-file`, который бэк уже использует. Задача 2.1 проверяет.
- [Кэш turbo: прошедший E2E не перезапустится при смене состояния базы или браузера] → принято человеком; `yarn e2e --force`.
- [Общая база `writechart_test` у Vitest бэка и E2E] → таблиц нет; изоляцию решим с ORM.
- [`apt` в `--with-deps` замедлит задачу `e2e`] → первый зелёный запуск CI (PR, коммит `bfd076b`, 20.11.2026): `check` 52 с, `e2e` 57 с, идут параллельно. Шаги `e2e`: Postgres 15 с, `yarn install` 13 с, `playwright install --with-deps chromium --only-shell` 11 с, `yarn e2e` (сборка + 2 теста) 5 с.
- [knip не увидит конфиг или тесты Playwright] → задача 5.1 запускает `yarn deps`; если knip ошибается, правим его конфиг, проверку не отключаем.
- [`typescript/no-floating-promises` не ловит забытый `await` у `expect` Playwright] → задача 4.1 проверяет на временном файле. Если не ловит — сообщить человеку.
