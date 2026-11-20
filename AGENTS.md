# AGENTS.md — Writechart

Инструкции для ИИ-агентов (Claude Code, Codex) и людей, которые с ними работают.

## Проект

Writechart — веб-сервис, который строит блок-схемы алгоритмов по коду (Python, C++, Pascal, псевдоязык) по ГОСТ 19.701-90 и ЕСПД. Пользователи: студенты и преподаватели. Открытый код.

## Стек

Монорепо: Yarn 4 workspaces + Turborepo, Node 24 (`.nvmrc`), TypeScript 7.

| Пакет | Что внутри |
|---|---|
| `frontend/` | React + Vite SPA, React Router, TanStack Query, Zustand, shadcn/ui |
| `backend/` | Node.js + TypeScript + Express 5, PostgreSQL |
| `shared/` | Zod-схемы, типы, константы для фронта и бэка |

Перед работой в папке прочитай её `AGENTS.md`. Архитектура и причины решений: `docs/architecture.md`, `docs/adr/`.

Инструменты: Oxlint (линтер, проверки по типам через TS 7), oxfmt (форматтер), knip (необъявленные зависимости), Vitest (тесты; во фронте — с React Testing Library на jsdom). ESLint и Prettier не используем: typescript-eslint не работает с TS 7 ([ADR-0012](docs/adr/0012-ts7-oxc-tooling.md)).

Решено, но пока не установлено: Supertest, Playwright. Не выбрано: ORM, деплой, окружения. Не добавляй эти инструменты без изменения в OpenSpec. Новый инструмент проверь: если он зависит от пакета `typescript` (API TypeScript), с TS 7 он может не работать.

## Команды

```bash
corepack enable          # один раз: включает Yarn 4.18.1 из package.json
yarn install
docker compose up -d     # PostgreSQL; перед этим скопируй .env.example в .env
yarn openspec list       # активные изменения OpenSpec

yarn dev                 # dev-серверы пакетов (turbo); фронт — Vite
yarn build               # сборка пакетов (turbo); фронт — в frontend/dist
yarn lint                # Oxlint с проверками по типам
yarn typecheck           # проверка типов tsc во всех пакетах (turbo); во фронте tsc -b
yarn test                # Vitest во всех пакетах (turbo)
yarn format              # oxfmt: отформатировать; yarn format:check — только проверить
yarn deps                # knip: импорт пакетов, не объявленных в package.json пакета
```

Перед тем как сказать «готово», прогони `yarn lint`, `yarn typecheck`, `yarn test`, `yarn format:check`, `yarn deps`, `yarn build`.

## Документация библиотек и скиллы

- **Context7** (MCP): сверяй API библиотеки с Context7 — перед кодом с её API, при непонятной ошибке или несходящемся типе из библиотеки, при смене версии зависимости. Обязательно для версий новее твоих знаний: TypeScript 7, React Router 8, Vitest 5.
- **Скиллы проекта** лежат копиями в `.claude/skills/` (Claude Code) и `.agents/skills/` (Codex); источник и коммит каждого — в `skills-lock.json`. Новый скилл ставь в обе папки сразу: `npx skills@latest add <репозиторий> --skill=<имя> -a claude-code -a codex --copy`.
- Когда правило скилла расходится с `AGENTS.md`, действует `AGENTS.md`.
- Спека для `code-review` — изменение OpenSpec: `openspec/changes/<имя>/` (proposal, design, tasks).

Для людей: настройка агентов (Context7, скиллы) — [`docs/agents-setup.md`](docs/agents-setup.md). Глобальную копию скилла проекта держи той же версии: в Claude Code личный скилл главнее проектного ([ADR-0013](docs/adr/0013-agent-skills-and-mcp.md)).

## Как работаем: всё через OpenSpec

1. Новая работа начинается с изменения в `openspec/changes/<имя>/`: `/opsx:propose` (Claude Code) или `$openspec-propose` (Codex).
2. **Человек читает и утверждает proposal.** Пока нет утверждения, код не пишешь.
3. Реализация строго по `tasks.md`: `/opsx:apply` / `$openspec-apply-change`. Отмечай задачи `- [x]` сразу после выполнения.
4. Проверки: `yarn openspec validate <имя>` и проверки из задач.
5. Когда ревью пройдено и CI зелёный, перед слиянием: `/opsx:archive` / `$openspec-archive-change` в той же ветке. Человек коммитит архив последним коммитом и сливает PR.

Правила:
- Делай только то, что есть в спеке и задачах. Нашёл другую проблему — сообщи человеку, не чини сам.
- Если для задачи нужно больше, чем написано, остановись и спроси. Не сужай и не упрощай требования молча.
- Не добавляй зависимости без нужды. Зависимость ставь в `package.json` того пакета, где она используется.
- Данные, которые идут между фронтом и бэком, описывай Zod-схемой в `shared/`.

## Git — только человек

Всё, что уходит на GitHub, делает человек.

- **Нельзя:** `git commit`, `git push`, `gh pr create`, merge, создание и удаление веток на GitHub, изменение истории (`rebase`, `reset --hard`, `push --force`).
- **Можно:** `git status`, `git diff`, `git log`, `git show`.
- **С согласия человека:** `git bisect` (его предлагает `diagnosing-bugs`): он переключает рабочую папку между коммитами.
- Когда работа готова, **предложи** название коммита и текст PR. Коммитит и открывает PR человек.

### Процесс

- GitHub Flow: ветка от `master`, PR в `master`. Прямой пуш в `master` запрещён.
- PR сливается только при зелёном CI, через кнопку GitHub в режиме merge commit.
- Коммиты по Conventional Commits со scope:

```
feat(api): add scheme saving endpoint
fix(security): harden sessions, reapply consent, input cleaning and headers
docs(adr): add ADR for ORM choice
chore(tooling): set up yarn 4, node 24 and openspec
```

Типы: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `style`.
