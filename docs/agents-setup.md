# Настройка агентов: Context7

Context7 — MCP-сервер со свежей документацией библиотек. Агенты (Claude Code, Codex) берут из него API библиотек, которые новее их знаний: TypeScript 7, React Router 8, Vitest 5. Почему он выбран: [ADR-0013](adr/0013-agent-skills-and-mcp.md).

Настройки сервера уже в репозитории (`.mcp.json` для Claude Code, `.codex/config.toml` для Codex). Каждому нужен только свой ключ.

## 1. Получить ключ

1. Войдите на [context7.com](https://context7.com) (можно через GitHub).
2. Откройте [Dashboard → Settings](https://context7.com/dashboard?tab=settings) и нажмите Create API Key.
3. Имя — любое, например `writechart`. Галочку **Write access не ставьте**: для документации она не нужна.
4. Скопируйте ключ: он показывается один раз.

Бесплатный аккаунт — 1000 запросов в месяц.

## 2. Сохранить ключ в переменную `CONTEXT7_API_KEY`

Ключ хранится только у вас. В репозиторий, чаты и PR его не вставляйте.

**Windows** (PowerShell):

```powershell
[Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "ваш_ключ", "User")
```

**macOS / Linux** — добавьте строку в `~/.zshrc` или `~/.bashrc`:

```bash
export CONTEXT7_API_KEY="ваш_ключ"
```

## 3. Перезапустить

Закройте и откройте заново терминал, Claude Code и Codex: новая переменная видна только после перезапуска.

Проверка (Git Bash, macOS, Linux), ключ не выводится:

```bash
[ -n "$CONTEXT7_API_KEY" ] && echo "ключ есть" || echo "ключа нет"
```

## 4. Разрешить сервер

- **Claude Code** при первом запуске в проекте спросит, разрешить ли сервер `context7` из `.mcp.json`. Ответьте да.
- **Codex** читает `.codex/config.toml` только в проекте, которому вы доверяете. Когда Codex спросит, доверяете ли вы папке проекта, ответьте да.

## 5. Проверить

Попросите агента: «посмотри в Context7, как работает useBlocker в React Router». Агент должен вызвать инструменты `resolve-library-id` и `query-docs`.

Если сервер не подключается — проверьте шаг 3: чаще всего агент запущен до того, как появилась переменная.

## Глобально, для своих проектов (по желанию)

**Claude Code** (в Git Bash или терминале macOS/Linux; `$CONTEXT7_API_KEY` подставится сам):

```bash
npx @anthropic-ai/claude-code mcp add --scope user --transport http context7 https://mcp.context7.com/mcp --header "Authorization: Bearer $CONTEXT7_API_KEY"
```

**Codex** — допишите в конец `~/.codex/config.toml`:

```toml
[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
bearer_token_env_var = "CONTEXT7_API_KEY"
```

В Writechart всё равно сработает настройка проекта, в других проектах — глобальная.
