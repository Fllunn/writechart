# AGENTS.md — Writechart

Инструкции для ИИ-агентов (Claude Code, Codex) и людей, которые с ними работают.

## Проект

Writechart — веб-сервис, который строит блок-схемы алгоритмов по коду (Python, C++, Pascal, псевдоязык) по ГОСТ 19.701-90 и ЕСПД. Пользователи: студенты и преподаватели. Открытый код.

## Стек

Монорепо: Yarn 4 workspaces, Node 24 (`.nvmrc`).

| Пакет | Что внутри |
|---|---|
| `frontend/` | React + Vite SPA, React Router, TanStack Query, Zustand, shadcn/ui |
| `backend/` | Node.js + TypeScript + Express 5, PostgreSQL |
| `shared/` | Zod-схемы, типы, константы для фронта и бэка |

Перед работой в папке прочитай её `AGENTS.md`. Архитектура и причины решений: `docs/architecture.md`, `docs/adr/`.

Решено, но пока не установлено: Turborepo, ESLint + Prettier, Vitest, React Testing Library, Supertest, Playwright. Не выбрано: ORM, деплой, окружения. Не добавляй эти инструменты без изменения в OpenSpec.

## Команды

```bash
corepack enable          # один раз: включает Yarn 4.18.1 из package.json
yarn install
docker compose up -d     # PostgreSQL; перед этим скопируй .env.example в .env
yarn openspec list       # активные изменения OpenSpec
```

## Как работаем: всё через OpenSpec

1. Новая работа начинается с изменения в `openspec/changes/<имя>/`: `/opsx:propose` (Claude Code) или `$openspec-propose` (Codex).
2. **Человек читает и утверждает proposal.** Пока нет утверждения, код не пишешь.
3. Реализация строго по `tasks.md`: `/opsx:apply` / `$openspec-apply-change`. Отмечай задачи `- [x]` сразу после выполнения.
4. Проверки: `yarn openspec validate <имя>` и проверки из задач.
5. После слияния PR: `/opsx:archive` / `$openspec-archive-change`.

Правила:
- Делай только то, что есть в спеке и задачах. Нашёл другую проблему — сообщи человеку, не чини сам.
- Если для задачи нужно больше, чем написано, остановись и спроси. Не сужай и не упрощай требования молча.
- Не добавляй зависимости без нужды. Зависимость ставь в `package.json` того пакета, где она используется.
- Данные, которые идут между фронтом и бэком, описывай Zod-схемой в `shared/`.

## Git — только человек

Всё, что уходит на GitHub, делает человек.

- **Нельзя:** `git commit`, `git push`, `gh pr create`, merge, создание и удаление веток на GitHub, изменение истории (`rebase`, `reset --hard`, `push --force`).
- **Можно:** `git status`, `git diff`, `git log`, `git show`.
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
