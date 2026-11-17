# Design

## Context

Репозиторий пустой (README). Уже настроено: Yarn 4.18.1 через Corepack, `.nvmrc`, `.yarnrc.yml`, `.gitignore`, корневой `package.json`, OpenSpec (`openspec/`, `.claude/skills/`, `.claude/commands/opsx/`, `.agents/skills/`). Решения по стеку приняты командой и перечислены в proposal.md.

## Goals / Non-Goals

**Goals:**
- Каркас, который проходит `yarn install` и с которым агент сразу понимает правила.
- Все решения по архитектуре записаны в `docs/` и ADR, чтобы показать их на защите.

**Non-Goals:**
- Установка инструментов разработки (turbo, eslint, prettier, typescript, vitest, playwright).
- Код приложения и CI.

## Decisions

1. **Папки `frontend/`, `backend/`, `shared/` в корне** вместо `apps/` + `packages/`. Так проще читать структуру, и такая раскладка есть у Mattermost (`server/` + `webapp/`).
2. **Имена пакетов** `@writechart/frontend`, `@writechart/backend`, `@writechart/shared`, все `private: true`, `type: module`.
3. **`shared` без сборки (Just-in-Time):** `exports` указывают на `.ts`-исходники, подпути вместо barrel-файла. Пока подпутей нет, указываем только `"./*": "./src/*.ts"`.
4. **AGENTS.md в каждом пакете.** Корневой хранит общие правила, а в пакете — только правила этой папки. Claude Code и Codex читают ближайший файл. `CLAUDE.md` содержит одну строку `@AGENTS.md`: Claude Code подключает файл по такой ссылке.
5. **Git-правила только текстом в AGENTS.md**, без технического запрета (`settings.json deny`). Это решение команды «пока».
6. **docker-compose:** один сервис `postgres` (образ `postgres:18`) с базами `writechart` и `writechart_test`. Тестовая база создаётся init-скриптом.
7. **ADR в формате** Контекст → Решение → Варианты → Последствия, по одному файлу на решение.

## Risks / Trade-offs

- [Правила для агентов без технического запрета] → агент может их нарушить. Смягчение: явный раздел «Git — только человек» в корневом AGENTS.md и ревью человеком перед коммитом.
- [OpenSpec 2.0.0 вместо 2.1.0] → Yarn не поставил 2.1.0, вышедшую 17.11.2026; вероятно, сработала защита Yarn от слишком свежих версий. Смягчение: обновить позже командой `yarn up`.
- [Версия образа Postgres] → выбрана последняя мажорная. Смягчение: закрепить точную версию при настройке деплоя.

## Open Questions

- Лицензия (MIT / Apache-2.0 / GPL / AGPL): файл `LICENSE` не создаётся до решения.
- Упоминать ли Context7 MCP в AGENTS.md.
- Язык артефактов OpenSpec (сейчас русский) — записать в `openspec/config.yaml`, когда команда решит.
