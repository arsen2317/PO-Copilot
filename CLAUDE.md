# CLAUDE.md

Инструкции для Claude Code по проекту **«Барометр»**. Этот файл подгружается автоматически в начале каждой сессии — держи его коротким.

## С чего начать каждой сессии

1. Прочитай **`STATUS.md`** — текущее состояние, что сделано, что дальше, какие решения приняты.
2. Загляни в **`BAROMETER.md`** только при необходимости — это полная спецификация (что строим). Не читай её целиком ради мелкой правки.
3. Не читай всю кодовую базу. Открывай только файлы, относящиеся к текущей задаче (ориентир — раздел в `STATUS.md`).

## В конце каждой сессии

Обнови **`STATUS.md`**: что сделал, что осталось, новые принятые решения, следующий шаг. Без этого следующая сессия стартует вслепую.

## Карта проекта

- `BAROMETER.md` — спецификация: видение, экраны, модель данных, маршруты, фазы.
- `STATUS.md` — журнал прогресса и принятых решений (источник истины о состоянии).
- `CLAUDE.md` — этот файл: как работать, куда смотреть.
- `src/` — код; структура и конвенции описаны в `BAROMETER.md`, разделы 5 и 14.

## Неизменные правила

- **Дизайн-система — Ant Design (antd) v5, только тёмная тема** (`ConfigProvider` + `theme.darkAlgorithm`). Не вводи другие UI-библиотеки и не пиши то, что уже есть в antd. Стилизация — через design tokens, не произвольный CSS.
- **Язык интерфейса — русский.** Доменные термины — как в спецификации.
- **TypeScript строгий**, без `any`. Доменные типы — в `data/types/`.
- **Одна фича — одна папка** в `src/features/`.
- **Данные только через `data/api/`** (сейчас читает фикстуры), компоненты не лезут в фикстуры напрямую.
- **Цвета рисков** — из токенов (`colorError`/`colorWarning`/`colorSuccess`), не хардкодом.
- Перед завершением задачи — типчек, линт, тесты.

## Команды

- Установка: `npm install`
- Дев-сервер: `npm run dev` (http://localhost:5173)
- Типчек: `npm run typecheck`
- Линт: `npm run lint`
- Тесты: `npm run test`
- Тесты (watch): `npm run test:watch`
- Сборка: `npm run build`
- Preview сборки: `npm run preview`
- Деплой: merge в `main` → GitHub Actions автоматически деплоит на VPS

## Деплой (VPS)

- Хостинг — VPS Timeweb, Ubuntu 24.04, IP `72.56.34.107`, домен `copilot.mts-fintech.ru`.
- **Фронтенд** — nginx отдаёт `dist/` как SPA (`try_files $uri /index.html`), SSL через certbot.
- **API-сервер** — `scripts/dev-api-server.ts` запускается через PM2 (`po-copilot-api`) на порту 3001. nginx проксирует `/api/` → `localhost:3001`.
- **CI/CD** — GitHub Actions (`push → main`): сборка на runner → SCP `dist/` → SSH (пишет `.env.local`, `npm ci`, рестарт PM2).
- **Секреты** — хранятся в GitHub Secrets, на сервер попадают через `.env.local` при каждом деплое. Никогда не коммить `.env.local`.
- **Cloudflare Worker** (`anthropic-proxy.arackelian.workers.dev`) — проксирует запросы к Anthropic и Brave Search, обходя блокировку российских IP. Защищён заголовком `x-proxy-secret`. Worker живёт в репо `arsen2317/anthropic-proxy`.
- **Необходимые GitHub Secrets:** `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `ANTHROPIC_API_KEY`, `APP_LOGIN`, `APP_PASSWORD`, `APP_SESSION_SECRET`, `BRAVE_SEARCH_API_KEY`, `ANTHROPIC_PROXY_URL`, `BRAVE_PROXY_URL`, `PROXY_SECRET`.
- **Маршруты Worker'а** (критично, не ломать):
  - `ANTHROPIC_PROXY_URL` = `https://anthropic-proxy.arackelian.workers.dev/anthropic` → SDK шлёт запросы на `/anthropic/v1/messages`, Worker стрипает `/anthropic` и форвардит на `api.anthropic.com`.
  - `BRAVE_PROXY_URL` = `https://anthropic-proxy.arackelian.workers.dev/brave` → VPS шлёт запросы на `/brave/res/v1/web/search`, Worker стрипает `/brave` и форвардит на `api.search.brave.com`.
  - Секреты Worker'а в Cloudflare dashboard: `PROXY_SECRET`, `ANTHROPIC_API_KEY`, `BRAVE_SEARCH_API_KEY`.
- **Диагностика прокси** (если ИИ не отвечает):
  ```bash
  # На VPS — должен вернуть HTTP 200 с JSON от Claude:
  PROXY_SECRET=$(grep ^PROXY_SECRET /var/www/po-copilot/.env.local | cut -d= -f2)
  PROXY_URL=$(grep ^ANTHROPIC_PROXY_URL /var/www/po-copilot/.env.local | cut -d= -f2)
  curl -s -w "\nHTTP: %{http_code}\n" "${PROXY_URL}/v1/messages" \
    -H "x-proxy-secret: ${PROXY_SECRET}" -H "content-type: application/json" \
    -H "anthropic-version: 2023-06-01" \
    -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
  ```
- **Production-деплой — только с моего явного подтверждения** (merge в `main`).

## Чего не делать без подтверждения

- Менять стек, дизайн-систему или тему.
- Деплоить в production.
- Подключать реальные интеграции (Jira, Git и т.д.) — это фаза 4, не раньше.
- Рефакторить разделы, не относящиеся к текущей задаче.
