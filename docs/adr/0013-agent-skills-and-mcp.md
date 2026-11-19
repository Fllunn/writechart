# ADR-0013: Сторонние скиллы агентов и Context7

Статус: принято · 2026-11-20 · дополняет [ADR-0011](0011-ai-development.md)

## Контекст

ADR-0011 оставил открытыми сторонние скиллы и MCP-серверы. Курс требует скиллы в репозитории. Агенты работают у четырёх человек в Claude Code и Codex, и правила у всех должны быть одни.

Часть стека вышла позже, чем закончилось обучение моделей: TypeScript 7, React Router 8, Vitest 5. По таким библиотекам агент пишет код по старому API, если не видит свежую документацию.

## Решение

**Скиллы лежат в репозитории**, копиями в двух папках: `.claude/skills/` (Claude Code) и `.agents/skills/` (Codex). Ставятся через `npx skills@latest add <репозиторий> --skill=<имя> -a claude-code -a codex --copy`. Источник и коммит каждого скилла записаны в `skills-lock.json`. Копии, а не ссылки: ссылки на Windows и в git ломаются.

Выбранные скиллы:

| Источник | Скиллы | Зачем |
|---|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills), MIT | `grill-me` + `grilling`, `tdd` + `codebase-design`, `diagnosing-bugs`, `code-review`, `writing-for-agents` | допрос по плану, разработка через тесты, отладка, ревью, правила для агентских файлов |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills), MIT | `vercel-react-best-practices`, `vercel-composition-patterns` | правила React |
| [shadcn/ui](https://ui.shadcn.com/docs/skills) | `shadcn` | работа с shadcn/ui |
| [anthropics/skills](https://github.com/anthropics/skills), Apache 2.0 | `frontend-design` | визуальный дизайн интерфейсов |
| [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli), Apache 2.0 | `playwright-cli` | браузер и E2E-тесты |

`grill-me` вызывает `grilling`, `tdd` вызывает `codebase-design`: ставятся парами.

**Context7** ([upstash/context7](https://github.com/upstash/context7), MIT) — MCP-сервер со свежей документацией библиотек по версиям. Удалённый сервер `https://mcp.context7.com/mcp`, настройки в репозитории: `.mcp.json` (Claude Code) и `.codex/config.toml` (Codex). Ключ у каждого свой, в переменной окружения `CONTEXT7_API_KEY`; в репозитории только имя переменной. Бесплатный аккаунт — 1000 запросов в месяц ([документация](https://context7.com/docs)).

## Варианты

- **Плагины** (Claude Code, Codex). Обновляются сами, но в репозиторий не попадают, ставят набор целиком и у каждого свою версию.
- **Глобальная установка у каждого по инструкции.** Нет файлов в репозитории, но версии расходятся и требование курса не выполнено.
- **superpowers** ([obra/superpowers](https://github.com/obra/superpowers)). Свои планы и работа с ветками пересекаются с OpenSpec и правилом «git только человек»; TDD и отладка уже есть от Matt Pocock.
- **Скиллы Matt Pocock `to-spec`, `to-tickets`, `implement`, `pr`.** Свои спеки, тикеты и коммиты вместо OpenSpec.
- **Playwright MCP**, **Chrome DevTools MCP.** Повторяют скилл `playwright-cli`.
- **GitHub MCP.** Даёт агенту PR и issues — против правила «git только человек».
- **DeepWiki MCP** вместо Context7. Бесплатный и без ключа, но это вики, которую ИИ написал по коду, а не официальная документация.
- **Ссылки на `llms.txt`** библиотек вместо MCP. Без лимитов, но у React Router, Tailwind и Playwright файла нет (проверено 20.11.2026).

## Последствия

- Скилл обновляется одним PR для всех: `npx skills@latest update`, затем коммит.
- В Claude Code личный скилл (`~/.claude/skills/`) главнее проектного с тем же именем ([документация](https://code.claude.com/docs/en/skills)). Глобальная копия скилла проекта должна быть той же версии, иначе у человека тихо работают другие правила.
- Каждому участнику нужен ключ Context7. Без переменной `CONTEXT7_API_KEY` сервер в Claude Code не подключится.
- Codex читает `.codex/config.toml` только в проекте, которому человек доверяет.
- `tdd` допускает моки базы «иногда», `backend/AGENTS.md` строже — без моков базы. Действует правило `AGENTS.md`.
- `diagnosing-bugs` может предложить `git bisect`. Решение о git — за человеком.
- Файлы лицензий MIT для скиллов Matt Pocock и Vercel не добавлены — открытый вопрос.
- Другие MCP (shadcn, PostgreSQL) подключаются вместе с изменениями, где они нужны.
- Скиллы и Context7 добавлены без изменения OpenSpec — решение человека.
