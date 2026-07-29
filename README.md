# «Барометр» — PO Copilot

Рабочее пространство продакт-оунера: аналитика продукта, задачи и ИИ-ассистент в одном интерфейсе.
Прототип на моковых данных — интерфейс полный и рабочий, источники данных пока фикстуры.

## Стек

| Слой | Технология |
|------|------------|
| Сборка | Vite 8 |
| UI | React 19 + TypeScript (strict), antd v5 (тёмная/светлая тема через `ConfigProvider` + `theme.darkAlgorithm`) |
| Состояние | Zustand (`src/store/`), TanStack Query |
| Графики | `@ant-design/plots` + кастомные SVG |
| Бэкенд | Express (`scripts/api-server.ts`), запускается через `tsx` |
| ИИ | Anthropic SDK, SSE-стриминг, tool use |
| Тесты | Vitest + Testing Library |

Язык интерфейса — русский. Другие UI-библиотеки не используются, стилизация — через design tokens antd.

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # заполнить значения, см. ниже
npm run dev                  # API :3001 + Vite :5173
```

Без `.env.local` фронтенд поднимется, но логин и ИИ-чат работать не будут — они ходят на API-сервер.

## Команды

| Команда | Что делает |
|---------|------------|
| `npm run dev` | API-сервер (:3001) и Vite (:5173) параллельно |
| `npm run dev:vite` | только фронтенд, без API |
| `npm start` | только API-сервер на порту 3002 |
| `npm run build` | `tsc -b` + сборка в `dist/` |
| `npm run typecheck` | проверка типов без эмита |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (однократный прогон) |
| `npm run preview` | локальный просмотр собранного `dist/` |

Перед коммитом прогнать `typecheck`, `lint`, `test`.

## Переменные окружения

Все переменные читаются API-сервером (`scripts/api-server.ts`) и запасным Vercel-путём (`api/`).
Фронтенду переменные не нужны — ключи никогда не попадают в браузер.

Файл `.env.local` (в `.gitignore`, **никогда не коммитить**). Шаблон — `.env.example`.

### Авторизация — обязательно

| Переменная | Назначение | Пример |
|------------|-----------|--------|
| `APP_LOGIN` | Логин. Проверяется только на сервере, эндпоинт `POST /api/auth` | `product-owner` |
| `APP_PASSWORD` | Пароль к этому логину | `<длинная случайная строка>` |
| `APP_SESSION_SECRET` | Секрет для HMAC-SHA256 подписи сессионных токенов. При смене все выданные токены инвалидируются | `<32+ случайных символов>` |

Без этих трёх `/api/auth` вернёт 500, войти в приложение будет нельзя. `APP_SESSION_SECRET`
проверяется и на `/api/chat`, и на `/api/search` — запросы без валидного токена отклоняются.

### ИИ-чат — обязательно для ассистента

| Переменная | Обяз. | Назначение | Пример |
|------------|-------|-----------|--------|
| `ANTHROPIC_API_KEY` | да | Ключ Anthropic API. Без него `/api/chat` вернёт 500 | `sk-ant-...` |
| `ANTHROPIC_PROXY_URL` | нет | `baseURL` для SDK — прокси в обход региональной блокировки. Если не задан, SDK ходит напрямую в `api.anthropic.com` | `https://<worker>.workers.dev/anthropic` |

Разрешённая модель одна — `claude-haiku-4-5-20251001` (белый список `ALLOWED_MODELS`
в `scripts/api-server.ts`); значение из запроса вне списка молча заменяется на неё.

⚠️ Суффикс пути в `ANTHROPIC_PROXY_URL` (`/anthropic`) обязателен — прокси срезает его
и форвардит остаток на `api.anthropic.com`.

### Веб-поиск — опционально

| Переменная | Назначение |
|------------|-----------|
| `BRAVE_SEARCH_API_KEY` | Ключ Brave Search API, эндпоинт `/api/search`, инструмент `search_web`. Без него поиск возвращает пустой результат с пояснением — приложение не падает |
| `BRAVE_PROXY_URL` | Прокси для Brave (суффикс `/brave`). По умолчанию `https://api.search.brave.com` |

### Прочее

| Переменная | Назначение | По умолчанию |
|------------|-----------|--------------|
| `PROXY_SECRET` | Заголовок `x-proxy-secret` для защищённого прокси. Нужен, только если задан `ANTHROPIC_PROXY_URL` / `BRAVE_PROXY_URL` | — |
| `PORT` | Порт API-сервера | `3001` (`npm start` использует `3002`) |

## Структура

```
src/
  app/           AppShell, роутинг, провайдеры (тема, query-клиент)
  features/      одна папка на раздел: assistant, dashboard, tasks, metrics,
                 funnel, unit-economics, my-cluster, cjm, knowledge-base,
                 agents, ai-services, rooms, profile, notifications, auth, analytics
  data/
    api/         единственный источник данных для UI
    fixtures/    моковые данные (в UI напрямую не импортируются)
    types/       все TypeScript-типы домена
  lib/           agentPrompts.ts, specialists.ts, tools.ts, claude.ts — ИИ-слой
  store/         Zustand-сторы (ui, knowledge, theme)
  styles/        global.css, CSS-переменные тем
scripts/
  api-server.ts  API-сервер (dev и production)
  start-api.sh   обёртка запуска под PM2
api/              запасной serverless-путь (Vercel): auth, chat, search
```

Правила проекта: данные UI берёт **только** через `data/api/`, не из фикстур напрямую;
цвета рисков — токены `colorError`/`colorWarning`/`colorSuccess`, не хардкод; `any` запрещён.

## ИИ-ассистент

Клиент (`src/features/assistant`) отправляет диалог на `POST /api/chat`, сервер стримит
ответ обратно по SSE. Ассистент работает как оркестратор со специалистами
(`src/lib/specialists.ts`): интерактивный сбор требований идёт у оркестратора, тяжёлое
исполнение — у stateless-специалиста по готовому ТЗ. Инструменты (`src/lib/tools.ts`)
читают те же моковые данные, что и UI, и умеют создавать черновики задач, CJM и артефакты
базы знаний.

Системные промпты — `src/lib/agentPrompts.ts`. История архитектурных решений и отвергнутых
вариантов — `agent-architecture-notes.txt`.

## Развёртывание

Текущая схема: nginx отдаёт SPA из `dist/` и проксирует `/api/` на API-сервер под PM2
(процесс `po-copilot-api`, порт 3001). CI/CD — GitHub Actions
(`.github/workflows/deploy.yml`): push в `main` → сборка → копирование `dist/` по SCP →
рестарт PM2 по SSH. Секреты хоста, пользователя и ключей хранятся в GitHub Secrets и
на деплое записываются в `.env.local` на сервере.

Конфигурация PM2 — `ecosystem.config.cjs`.

`api/` + `vercel.json` — параллельный запасной канал деплоя на Vercel. Он ходит в Anthropic
напрямую, тогда как основной сервер — через прокси. **Серверные правки ИИ-слоя нужно
зеркалить в оба файла** (`scripts/api-server.ts` и `api/chat.ts`), иначе запасной путь отстанет.

## Состояние проекта

Подробный статус, план работ и история решений — в `STATUS.md`.
Инструкции для работы с ассистентом Claude Code — в `CLAUDE.md`.
