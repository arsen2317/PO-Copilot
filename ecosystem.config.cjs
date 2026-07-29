// Конфигурация PM2 для запуска API-сервера без Docker.
// Пути берутся от расположения этого файла — привязки к конкретной машине нет.
module.exports = {
  apps: [
    {
      name: 'po-copilot-api',
      script: 'tsx',
      args: 'scripts/api-server.ts',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
    },
  ],
};
