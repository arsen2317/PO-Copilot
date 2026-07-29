# Образ «Барометра»: один контейнер отдаёт и SPA, и API.
# Отдельный nginx не нужен — статику раздаёт тот же процесс.
#
# Сборка:  docker build -t po-copilot .
# Запуск:  docker run -p 3001:3001 --env-file .env.local po-copilot
#
# Переменные окружения передаются при запуске (см. .env.example).
# В образ секреты НЕ зашиваются.

# ── Стадия сборки ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Сначала манифесты — слой с зависимостями переиспользуется, пока они не менялись.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# tsc -b (проверка типов) + vite build → dist/
RUN npm run build

# ── Рантайм ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Только продакшн-зависимости: express, openai, tsx. Инструменты сборки не нужны.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Собранный фронтенд и серверный код. Исходники src/ в образ не попадают.
COPY --from=build /app/dist ./dist
COPY scripts ./scripts

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tsx запускает TypeScript напрямую — так же, как сервер работает под PM2.
CMD ["./node_modules/.bin/tsx", "scripts/api-server.ts"]
