# AGENTS.md — e2e

Сначала прочитай корневой [`../AGENTS.md`](../AGENTS.md): процесс OpenSpec и правила Git действуют и здесь.

## Что здесь

E2E-тесты на Playwright: настоящий браузер (Chromium) открывает собранный сайт. Тест поднимает весь стек сам:

| Сервер | Команда | Адрес |
|---|---|---|
| бэк | `yarn workspace @writechart/backend start` (`dist/server.js`) | `http://127.0.0.1:3100` |
| фронт | `vite preview`, `/api` проксируется на бэк | `http://127.0.0.1:4173` (`baseURL`) |

- База — `writechart_test`: адрес из `DATABASE_URL_TEST` (переменная процесса или корневой `.env`), бэк получает его как `DATABASE_URL`.
- Порты свои, не как у `yarn dev` (5173 и 3000). Занятый порт — ошибка сразу; чужой запущенный сервер тест не берёт.
- Перед тестами turbo собирает фронт и бэк (`dependsOn: ["^build"]`), поэтому тест всегда видит свежую сборку. Для этого `@writechart/frontend` и `@writechart/backend` стоят в `dependencies` пакета: код из них не импортируется, они нужны только графу задач turbo.

## Запуск

```bash
docker compose up -d                                          # база, как для yarn test
yarn workspace @writechart/e2e playwright install chromium --only-shell   # один раз на машину
yarn e2e                                                      # из корня: сборка + тесты
yarn e2e --force                                              # мимо кэша turbo
yarn workspace @writechart/e2e playwright show-report         # HTML-отчёт последнего прогона
```

Лог бэка (уровень `warn`) идёт в вывод теста с меткой `[backend]`. Тест `/api/health/ready` упал с 503 — причина там (например, `password authentication failed` или `ECONNREFUSED`).

В CI E2E идёт отдельной задачей `e2e` в `.github/workflows/ci.yml`. При падении HTML-отчёт с trace лежит в артефакте `playwright-report` (14 дней).

## Правила папки

- Тест трогает приложение только снаружи: через браузер (`page`) или HTTP (`request`). Не импортируй код из `frontend/` и `backend/`.
- Ответы API разбирай схемами из `@writechart/shared`, как в тестах бэка.
- Ищи элементы по роли и тексту (`getByRole`, `getByText`), как видит пользователь.
- `await` у каждого `expect(...)` и действия страницы. Забытый `await` ловит `yarn lint` (`typescript/no-floating-promises`).
- `test.only` в CI роняет прогон (`forbidOnly`).
- Тесты — `tests/<сценарий>.spec.ts`, имена файлов в kebab-case.
- Только Chromium. Другой браузер — строка в `projects` в `playwright.config.ts`, через изменение OpenSpec.
- Playwright стирает типы сам и их не проверяет; типы проверяет `yarn typecheck`.
