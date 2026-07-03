# CLAUDE.md

Инструкции для Claude Code по проекту **«Барометр»**.

## Начало сессии
1. Прочитай `STATUS.md` — состояние, решения, следующий шаг.
2. Открывай только файлы, нужные для текущей задачи.

## Конец сессии
Обнови `STATUS.md`: что сделал, что осталось, новые решения, следующий шаг.

## Правила
- **Дизайн-система — antd v5, тёмная тема** (`ConfigProvider` + `theme.darkAlgorithm`). Без других UI-библиотек. Стиль — через design tokens, не произвольный CSS.
- **Язык интерфейса — русский.**
- **TypeScript строгий**, без `any`. Типы — в `data/types/`.
- **Одна фича — одна папка** в `src/features/`.
- **Данные только через `data/api/`**, не из фикстур напрямую.
- **Цвета рисков** — `colorError`/`colorWarning`/`colorSuccess`, не хардкодом.
- Перед коммитом — `npm run typecheck`, `npm run lint`, `npm run test`.

## Команды
```
npm install        # установка
npm run dev        # дев-сервер :5173
npm run typecheck  # TS
npm run lint       # ESLint
npm run test       # Vitest
npm run build      # сборка
```

## Инфраструктура

**VPS** — Timeweb Ubuntu 24.04, IP `72.56.34.107`, домен `copilot.mts-fintech.ru`.
nginx → SPA (`dist/`) + проксирует `/api/` → PM2 `po-copilot-api` на порту 3001 (`scripts/dev-api-server.ts`).
CI/CD: push → `main` → GitHub Actions → SCP dist/ → SSH restart PM2.
Секреты: GitHub Secrets → `.env.local` на сервере. Никогда не коммить `.env.local`.

**Cloudflare Worker** (`anthropic-proxy.arackelian.workers.dev`, репо `arsen2317/anthropic-proxy`) — прокси для Anthropic API и Brave Search (обход блокировки РФ). Защищён `x-proxy-secret`.
- `ANTHROPIC_PROXY_URL = https://anthropic-proxy.arackelian.workers.dev/anthropic` → Worker стрипает `/anthropic`, форвардит на `api.anthropic.com`
- `BRAVE_PROXY_URL = https://anthropic-proxy.arackelian.workers.dev/brave` → Worker стрипает `/brave`, форвардит на `api.search.brave.com`
- Секреты Worker: `PROXY_SECRET`, `ANTHROPIC_API_KEY`, `BRAVE_SEARCH_API_KEY` — настраиваются в Cloudflare Dashboard.
- **Не менять маршруты и суффиксы URL** — они захардкожены в GitHub Secrets и переменных среды сервера.

Диагностика прокси (запуск на VPS):
```bash
PROXY_SECRET=$(grep ^PROXY_SECRET /var/www/po-copilot/.env.local | cut -d= -f2)
PROXY_URL=$(grep ^ANTHROPIC_PROXY_URL /var/www/po-copilot/.env.local | cut -d= -f2)
curl -s -w "\nHTTP: %{http_code}\n" "${PROXY_URL}/v1/messages" \
  -H "x-proxy-secret: ${PROXY_SECRET}" -H "content-type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

## Нельзя без подтверждения
- Менять стек или дизайн-систему.
- Деплоить в production (merge в `main`).
- Подключать реальные интеграции (Jira, Git и т.д.) — это фаза 4.
- Рефакторить вне текущей задачи.
