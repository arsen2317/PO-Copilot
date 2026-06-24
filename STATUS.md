# STATUS — состояние проекта «Барометр»

Журнал прогресса для работы по сессиям. Читается в начале сессии, обновляется в конце. Держим выше уровнем, чем git-коммиты: сводки сессий, решения, следующие шаги — не покоммитный лог.

---

## Текущее состояние

**Фаза:** 0 — каркас готов. ✅

**Что есть на сейчас:**
- `BAROMETER.md` — полная спецификация продукта.
- `CLAUDE.md` — инструкции для сессий.
- `STATUS.md` — этот файл.
- Полный каркас: Vite + React + TypeScript (строгий), antd v5 тёмная тема, AppShell, роутинг, data/api + фикстуры.

**Следующий шаг:** фаза 1 — статичные экраны на моковых данных. Начать с Дашборда (виджеты на antd Card + заглушки данных).

---

## Прогресс по фазам

| Фаза | Описание | Статус |
|------|----------|--------|
| 0 | Каркас (стек, AppShell, тема, data/api) | ✅ готово |
| 1 | Статичные экраны на моках | ⬜ не начато |
| 2 | Интерактив (DnD, фильтры, чат, конструктор) | ⬜ не начато |
| 3 | Сквозные сценарии на моках | ⬜ не начато |
| 4 | Реальные данные и интеграции | ⬜ не начато |
| 5 | Продакшн (a11y, перф, тесты) | ⬜ не начато |

Статусы: ⬜ не начато · 🟡 в работе · ✅ готово

---

## Прогресс по разделам

| Раздел | Маршрут | Статус |
|--------|---------|--------|
| Глобальный layout (AppShell) | — | ✅ |
| Дашборд | `/` | ✅ |
| Ассистент | `/assistant` | ✅ |
| Агенты | `/agents` | ⬜ заглушка |
| ИИ-сервисы | `/services` | ⬜ заглушка |
| Задачи | `/tasks` | ⬜ заглушка |
| Комнаты | `/rooms` | ⬜ заглушка |
| База знаний | `/knowledge` | ⬜ заглушка |
| Центр уведомлений | (панель) / `/notifications` | ⬜ заглушка |
| Профиль | `/profile` | ⬜ заглушка |

---

## Принятые решения

Журнал зафиксированных выборов, чтобы не передоговариваться каждую сессию.

| Дата | Решение | Причина |
|------|---------|---------|
| — | Только тёмная тема | требование заказчика |
| — | Стек: Vite + React + TS | стандарт под прототип дашборда |
| — | Старт как frontend-прототип на моках, интеграции — фаза 4 | сначала валидируем UX/IA |
| — | Хостинг — Vercel (preview на PR, production на `main`) | требование заказчика |
| 2026-06-19 | TanStack Query + QueryClientProvider в Providers.tsx | фаза 1 будет использовать useQuery |
| 2026-06-24 | **Дизайн-система сменена с antd v5 на shadcn/ui (ReUI) + Tailwind CSS** | решение заказчика; лучше гибкость кастомизации, современная эстетика |
| 2026-06-24 | Иконки: lucide-react (вместо @ant-design/icons) | экосистема shadcn/ReUI |
| 2026-06-24 | Цвета: CSS-переменные + Tailwind (вместо antd useToken) | стандарт shadcn |
| 2026-06-24 | Графики Phase 2: Recharts (вместо @ant-design/plots) | совместимость с Tailwind/shadcn |
| 2026-06-24 | Граф знаний Phase 2: React Flow (вместо @ant-design/graphs) | совместимость с Tailwind/shadcn |

---

## Открытые вопросы

См. также раздел 16 в `BAROMETER.md`.

- Аутентификация и модель прав доступа.
- Природа реального ассистента и агентов (LLM/инфраструктура).
- Точные веса формулы скоринга бэклога (ICE/RICE + compliance + стратегия).
- Хранилище и индексация графа знаний.
- Требования банка по аудиту и хранению данных.

---

## Журнал сессий

> Новые записи добавляй сверху.

### Сессия 4 — 2026-06-24
**Сделано:** миграция дизайн-системы с antd v5 на shadcn/ui (ReUI) + Tailwind CSS.
- Удалены: `antd`, `@ant-design/icons`
- Добавлены: `tailwindcss` v3, `postcss`, `autoprefixer`, `tailwindcss-animate`, `lucide-react`, `class-variance-authority`, `tailwind-merge`, `clsx`, `@radix-ui/*` (slot, dropdown-menu, tooltip, tabs, select, separator, avatar, progress)
- Созданы shadcn UI компоненты в `src/components/ui/`: button, card, input, textarea, badge, avatar, skeleton, separator, tabs, tooltip, dropdown-menu, select, progress
- Создан `src/lib/utils.ts` с `cn()`
- Переписаны: AppShell, AppHeader, AppSidebar, Providers, main.tsx
- Переписаны: DashboardPage + 5 виджетов
- Переписаны: AssistantPage, DialogList, MessageFeed, ContextPanel
- Обновлены все stub-страницы (убраны antd Typography.Title)
- Обновлены: CLAUDE.md, BAROMETER.md (разделы 4 и 8), STATUS.md
- typecheck ✅, lint ✅, tests 4/4 ✅
**Решения:** см. таблицу «Принятые решения» — добавлено 6 строк от 2026-06-24.
**Дальше:** Агенты, ИИ-сервисы, Задачи и остальные разделы фазы 1 (на новом стеке).

> Шаблон записей:
>
> ```
> ### Сессия N — YYYY-MM-DD
> **Сделано:** …
> **Решения:** … (продублируй в таблицу «Принятые решения»)
> **Дальше:** …
> ```

### Сессия 3 — 2026-06-19
**Сделано:** страница Ассистента (фаза 1).
- Типы: Dialog, Message, DialogType, MessageRole, DialogContext, DialogParticipant
- Фикстуры: 3 диалога (личный, групповой, личный) с полными лентами сообщений
- data/api/assistant.ts — getDialogs, getDialogById
- Три колонки: DialogList (табы Личные/Группы/Задачи), MessageFeed (лента + поле ввода), ContextPanel (продукт, спринт, задача, участники)
- /assistant и /assistant/:dialogId → одна компонента AssistantPage через useParams
- Высота: calc(100vh - header - padding), независимый scroll в каждой колонке
**Дальше:** Агенты, ИИ-сервисы, Задачи и остальные разделы фазы 1.

### Сессия 2 — 2026-06-19
**Сделано:** дашборд (фаза 1).
- Типы: FunnelStep, Incident, NpsPoint, SprintMetric, Product
- Фикстуры: воронка конверсии (5 шагов), инциденты (3), NPS-история (30 дней), sprint metric, продукты (3)
- data/api/dashboard.ts — async-функции через api-слой
- 5 виджетов: ConversionFunnelWidget, NpsTrendWidget, TeamVelocityWidget, IncidentsWidget, RecentNotificationsWidget
- DashboardPage: Select-переключатель продукта + Row/Col сетка
- Цвета рисков из useToken() (colorError/colorWarning/colorSuccess), без хардкода
- Спарклайн — inline SVG (antd plots не устанавливали, это Phase 2)
**Решения:** спарклайны пока через inline SVG; @ant-design/plots — когда нужна интерактивность (Phase 2).
**Дальше:** другие разделы фазы 1 (Ассистент, Агенты и т.д.).

### Сессия 1 — 2026-06-19
**Сделано:** фаза 0 — инициализация проекта и каркас.
- Vite + React + TypeScript (строгий режим: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- antd v5 с тёмной темой: один `ConfigProvider` + `theme.darkAlgorithm`, токены colorPrimary/colorError/colorWarning/colorSuccess из раздела 8 спецификации
- Структура папок из раздела 5: `app`, `components/layout`, `components/ui`, `components/widgets`, `features/*` (9 разделов), `data/fixtures`, `data/api`, `data/types`, `hooks`, `lib`, `styles`
- AppShell: хедер (логотип, глобальный поиск, колокольчик, аватар) + сворачиваемый сайдбар (7 разделов + кнопка «Создать»), активный раздел подсвечен
- React Router со всеми маршрутами из раздела 6 (16 маршрутов), страницы — заглушки с заголовком
- `data/api/` — async-функции с delay(300ms), не напрямую фикстуры
- `data/fixtures/` — tasks (4 шт.), notifications (4 шт.), agents (3 шт.)
- `data/types/` — интерфейсы Task, Notification, Agent, AIService, User
- `vercel.json` с SPA-rewrite, `.vercel/` в `.gitignore`
- Скрипты: dev, build, typecheck, lint, test
- Smoke-тесты (4/4 ✅), типчек ✅, линт ✅, build ✅

**Решения:** antd v5 (откатили с v6); TanStack Query подключён в Providers.tsx.
**Дальше:** фаза 1 — наполнение экранов. Начать с Дашборда.

### Сессия 0 — подготовка
**Сделано:** написана спецификация (`BAROMETER.md`), инструкции (`CLAUDE.md`), этот файл статуса. Зафиксирована дизайн-система antd + тёмная тема.
**Дальше:** фаза 0 — инициализация проекта и каркас.
