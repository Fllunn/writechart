# AGENTS.md — shared

Сначала прочитай корневой [`../AGENTS.md`](../AGENTS.md): процесс OpenSpec и правила Git действуют и здесь.

## Что здесь

Код, который нужен и фронту, и бэку:
- Zod-схемы данных API;
- типы, выведенные из схем (`z.infer`);
- константы: языки ввода, роли, лимиты.

Пакет без сборки (Just-in-Time): `exports` в `package.json` указывают на исходники `.ts` в `src/`, их компилирует тот, кто импортирует.

## Правила папки

- Только чистый TypeScript. Нельзя React, Express, DOM API, `fs`, `process` и прочее, что есть только в браузере или только в Node.
- Сначала Zod-схема, тип выводи из неё: `export type X = z.infer<typeof X>`. Тип вручную рядом не дублируй.
- Импорт по подпутям: `@writechart/shared/schemas`. Не делай `index.ts` с `export *`.
- Бэк в dev исполняет эти файлы через Node без сборки ([ADR-0014](../docs/adr/0014-backend-build-and-runtime.md)). Поэтому относительные импорты пиши с `.ts` (`./api-error.ts`), типы импортируй через `import type`. Нельзя `enum`, `namespace` с кодом и parameter properties: Node их не стирает.
- Изменение схемы затрагивает и фронт, и бэк: проверь оба.
