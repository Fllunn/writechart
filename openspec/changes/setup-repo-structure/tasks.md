# Tasks

## 1. Workspaces

- [ ] 1.1 Создать `frontend/`, `backend/`, `shared/` с `package.json` (`@writechart/*`, `private`, `type: module`; у shared поле `exports`) и добавить `workspaces` в корневой `package.json`; проверить: `yarn install` проходит, `yarn workspaces list` показывает 3 пакета

## 2. Корневые настройки

- [ ] 2.1 Добавить `.gitattributes`, `.editorconfig`, `.env.example`, `.dockerignore`; проверить: `git check-attr eol -- package.json` даёт `lf`
- [ ] 2.2 Добавить `docker-compose.yml` (postgres, базы `writechart` и `writechart_test`) и init-скрипт; проверить: `docker compose config` проходит без ошибок

## 3. Инструкции для агентов

- [ ] 3.1 Написать корневой `AGENTS.md`: проект, стек, команды, процесс OpenSpec, раздел «Git — только человек», Conventional Commits; проверить: в файле есть все эти разделы
- [ ] 3.2 Написать `AGENTS.md` в `frontend/`, `backend/`, `shared/` с правилами папки; проверить: каждый ссылается на корневой
- [ ] 3.3 Создать `CLAUDE.md` со ссылкой `@AGENTS.md`; проверить: файл есть, ссылка указывает на существующий файл
- [ ] 3.4 Добавить `.github/pull_request_template.md` (что сделано, ссылка на изменение OpenSpec, как проверить); проверить: файл есть

## 4. Документация

- [ ] 4.1 Написать `docs/architecture.md` (архитектура, стек с обоснованиями, структура репо, Git, тесты, отложенные решения); проверить: каждое решение из proposal.md отражено
- [ ] 4.2 Написать ADR `docs/adr/0001`…`0011` и `docs/adr/README.md` со списком; проверить: 11 файлов, у каждого есть разделы Контекст / Решение / Варианты / Последствия

## 5. Итоговая проверка

- [ ] 5.1 Прогнать `yarn install --immutable` и `openspec validate setup-repo-structure`; проверить: обе команды без ошибок

## Workflow follow-up

- Человек проверяет изменения, делает коммит и PR (агент предлагает текст).
- После слияния — `openspec archive setup-repo-structure`.
