# CLAUDE.md

Инструкции для Claude Code по проекту **«Барометр»**.

## Начало сессии
1. Прочитай `STATUS.md` — состояние, известные ограничения, что осталось сделать.
2. Открывай только файлы, нужные для текущей задачи.

## Конец сессии
Обнови `STATUS.md`: что сделал, что осталось, новые решения, следующий шаг.

## Правила
- **Дизайн-система — antd v5** (`ConfigProvider` + `theme.darkAlgorithm` / `defaultAlgorithm`). Поддержаны обе темы, тёмная — основная. Без других UI-библиотек. Стиль — через design tokens, не произвольный CSS.
- **Язык интерфейса — русский.** Комментарии в коде тоже.
- **TypeScript строгий**, без `any`. Типы — в `src/data/types/`.
- **Одна фича — одна папка** в `src/features/`.
- **Данные только через `src/data/api/`**, не из фикстур напрямую.
- **Цвета рисков** — `colorError`/`colorWarning`/`colorSuccess`, не хардкодом.
- **Системные промпты — в `src/skills/`**, по файлу на агента или сценарий. См. `src/skills/README.md`.
- Перед коммитом — `npm run typecheck`, `npm run lint`, `npm run test`.

## Команды
```
npm install        # установка
npm run dev        # API :3001 + Vite :5173
npm run typecheck  # TS
npm run lint       # ESLint
npm run test       # Vitest
npm run build      # сборка
```

## Архитектура в двух словах

**Данные** — фикстуры в `src/data/fixtures/`, доступ через `src/data/api/`. Реальные
источники (Jira, Confluence, Git, метрики) не подключены.

**ИИ-ассистент** — оркестратор со специалистами. Браузер (`src/lib/ai.ts`) шлёт
диалог в нейтральных типах приложения, сервер (`scripts/lib/ai-protocol.ts`)
переводит в формат OpenAI-совместимого API и обратно. Это единственное место,
знающее формат провайдера. Подробно — `agent-architecture-notes.txt`.

**Модель** — OpenAI-совместимый API (проверено на vLLM + Qwen), адрес в `AI_BASE_URL`.
Требования к запуску vLLM — в README, раздел «Требования к серверу модели».

**Аудит-лог** — журнал изменений конфигурации, требование ИБ. `src/lib/audit.ts` →
`POST /api/audit` → `scripts/lib/audit.ts`. Новое событие сначала вносится
в словарь `AUDIT_ACTIONS`.

## Развёртывание

Основной способ — Docker: один контейнер отдаёт и SPA, и API (`Dockerfile`).
Альтернатива — запуск под PM2 (`ecosystem.config.cjs`) с веб-сервером впереди.

Переменные окружения — `.env.example` и раздел README «Переменные окружения».
`.env.local` **никогда не коммитить** (покрыт `.gitignore`).

Диагностика доступа к модели:
```bash
curl -s -w "\nHTTP: %{http_code}\n" "${AI_BASE_URL}/chat/completions" \
  -H "content-type: application/json" \
  -d "{\"model\":\"${AI_MODEL}\",\"max_tokens\":10,\"messages\":[{\"role\":\"user\",\"content\":\"test\"}]}"
```

Проверка живости приложения: `curl -s http://localhost:3001/api/health`.

## Нельзя без подтверждения
- Менять стек или дизайн-систему.
- Деплоить в production.
- Подключать реальные интеграции (Jira, Git и т.д.).
- Рефакторить вне текущей задачи.
