# Архитектурные решения (ADR)

Каждое значимое решение — отдельный файл: Контекст → Решение → Варианты → Последствия. Новое решение получает следующий номер; старые не переписываются: если решение меняется, пишется новый ADR со ссылкой на старый.

| № | Решение | Статус |
|---|---|---|
| [0001](0001-monorepo.md) | Монорепо frontend / backend / shared | принято |
| [0002](0002-frontend-spa.md) | React + Vite SPA без метафреймворка | принято («пока») |
| [0003](0003-backend-express.md) | Express 5 + TypeScript | принято («пока») |
| [0004](0004-database-postgresql.md) | PostgreSQL | принято |
| [0005](0005-yarn-turborepo.md) | Yarn 4 (node-modules) + Turborepo | принято |
| [0006](0006-node-24.md) | Node.js 24 LTS | принято |
| [0007](0007-shared-zod.md) | Zod-схемы в shared | принято («пока») |
| [0008](0008-frontend-libraries.md) | React Router, TanStack Query, Zustand, shadcn/ui | принято («пока») |
| [0009](0009-testing.md) | Тесты, линтер, форматтер | принято; линтер и форматтер заменены ADR-0012 |
| [0010](0010-git-process.md) | GitHub Flow, merge commit, Conventional Commits | принято |
| [0011](0011-ai-development.md) | AGENTS.md и OpenSpec | принято; скиллы и MCP дополнены ADR-0013 |
| [0012](0012-ts7-oxc-tooling.md) | TypeScript 7, Oxlint, oxfmt и knip вместо ESLint и Prettier | принято |
| [0013](0013-agent-skills-and-mcp.md) | Сторонние скиллы агентов и Context7 | принято |
| [0014](0014-backend-build-and-runtime.md) | Запуск и сборка бэка: Node без сборки в dev, Vite на прод | принято |
| [0015](0015-logging-pino.md) | Логи бэка: pino и pino-http | принято |
