# Writechart

[![CI](https://github.com/Fllunn/writechart/actions/workflows/ci.yml/badge.svg)](https://github.com/Fllunn/writechart/actions/workflows/ci.yml)

Веб-сервис, который строит блок-схемы алгоритмов по коду на Python, C++, Pascal и псевдоязыке. Схемы — по ГОСТ 19.701-90 и ЕСПД. Для студентов и преподавателей.

## Статус

В разработке. Сейчас есть каркас: фронт с заглушкой главной, бэк с проверкой здоровья (`/api/health`), CI и E2E-тесты. Построения схем пока нет.

## Стек

[![Стек](https://skillicons.dev/icons?i=ts,react,vite,tailwind,nodejs,express,postgres,vitest)](https://skillicons.dev)

Монорепо: Yarn 4 workspaces + Turborepo, Node 24, TypeScript 7.

| Пакет | Что внутри |
| --- | --- |
| `frontend/` | React + Vite SPA, React Router, TanStack Query, Zustand, shadcn/ui |
| `backend/` | Node.js + TypeScript + Express 5, PostgreSQL |
| `shared/` | Zod-схемы, типы, константы для фронта и бэка |
| `e2e/` | E2E-тесты Playwright: собранный фронт + бэк + база в Chromium |

Инструменты: Oxlint, oxfmt, knip, Vitest, Playwright.

## Запуск для разработки

Нужны Node 24 (`.nvmrc`) и Docker.

```bash
corepack enable          # один раз: включает Yarn из package.json
yarn install
cp .env.example .env     # впиши пароль в POSTGRES_PASSWORD и в оба URL, подсказки — в файле
docker compose up -d     # PostgreSQL
yarn dev                 # dev-серверы фронта и бэка
```

Остальные команды (сборка, тесты, линтер, E2E) — в [`AGENTS.md`](AGENTS.md#команды).

## Как мы работаем

Любая работа начинается с изменения в [OpenSpec](openspec/): сначала proposal, потом код. Git — GitHub Flow: ветка от `master`, PR в `master`, слияние при зелёном CI.

Подробнее: [`AGENTS.md`](AGENTS.md), [`docs/architecture.md`](docs/architecture.md), [`docs/adr/`](docs/adr/).