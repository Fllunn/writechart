# Tasks

## 1. ADR-0009

- [x] 1.1 В `docs/adr/0009-testing.md` дописать в строку статуса «· линтер и форматтер заменены [ADR-0012](0012-ts7-oxc-tooling.md)»; проверить: ссылка ведёт на существующий файл `docs/adr/0012-ts7-oxc-tooling.md`
- [x] 1.2 В `docs/adr/0009-testing.md` зачеркнуть пункт «**ESLint + Prettier** — линтер и форматтер» и дописать «заменено [ADR-0012](0012-ts7-oxc-tooling.md): Oxlint и oxfmt»; проверить: остальной текст ADR-0009 не изменился (`git diff` — только две строки)

## 2. Проверка

- [x] 2.1 Прогнать `yarn openspec validate mark-adr-0009-superseded` и `yarn format:check`; проверить: оба без ошибок

## 3. Архив

- [x] 3.1 После ревью и зелёного CI, перед слиянием: `/opsx:archive mark-adr-0009-superseded` в этой же ветке; человек коммитит архив и сливает PR

## Workflow follow-up

- Человек проверяет изменения, делает коммит и PR (агент предлагает текст).
