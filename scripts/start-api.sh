#!/bin/bash
# Обёртка запуска API-сервера (например, под PM2).
# Каталог проекта вычисляется от расположения скрипта — жёстких путей нет.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec npx tsx scripts/api-server.ts
