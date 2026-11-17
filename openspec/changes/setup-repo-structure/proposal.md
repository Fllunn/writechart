# Proposal

## Why

В репозитории сейчас только README. Команде из 4 человек и ИИ-агентам (Claude Code, Codex) нужна общая основа: структура монорепо, единые версии инструментов, правила для агентов и записанные решения по архитектуре. Без неё каждый настроит проект по-своему, а агенты будут работать без правил.

## What Changes

- Структура монорепо: `frontend/`, `backend/`, `shared/` как Yarn workspaces. В каждом пакете свой `package.json` без зависимостей. Код приложения не пишется.
- Корневые настройки: `package.json` (workspaces, `packageManager: yarn@4.18.1`, `engines` Node `>=24 <25`), `.yarnrc.yml` (`nodeLinker: node-modules`), `.nvmrc` (`24`), `.gitignore`, `.gitattributes`, `.editorconfig`, `.env.example`, `.dockerignore`.
- `docker-compose.yml` с PostgreSQL для разработки и отдельной тестовой базой.
- Инструкции для агентов: `AGENTS.md` в корне и в каждом пакете, `CLAUDE.md` со ссылкой на `AGENTS.md`. Правила: вся работа идёт через OpenSpec; git-операции, которые уходят на GitHub (commit, push, PR, merge), делает только человек, агент лишь предлагает текст коммита и PR.
- Шаблон PR `.github/pull_request_template.md`.
- Документация: `docs/architecture.md` (архитектура и стек с обоснованиями) и ADR `docs/adr/0001…0011`.
- OpenSpec уже установлен (`@fission-ai/openspec` в devDependencies, `openspec init` для Claude Code и Codex). Это изменение его не трогает.

Вне рамок: код приложения, `turbo.json`, конфиги ESLint, Prettier, TypeScript, Vitest, CI-workflow, деплой, окружения, ORM, `LICENSE`. Каждое из этого будет отдельным изменением.

## Capabilities

### New Capabilities

Нет. Изменение касается только инструментов и документации, поведение системы не меняется, поэтому `skip_specs: true`.

### Modified Capabilities

Нет.

## Impact

- Новые файлы и папки в корне репозитория, в `frontend/`, `backend/`, `shared/`, `docs/` и `.github/`.
- Корневой `package.json` получает поле `workspaces`; `yarn install` должен пройти без ошибок.
- Зависимости не добавляются, кроме уже установленного OpenSpec.
