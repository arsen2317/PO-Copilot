module.exports = {
  apps: [
    {
      name: 'po-copilot-api',
      script: '/var/www/po-copilot/node_modules/.bin/tsx',
      args: 'scripts/dev-api-server.ts',
      cwd: '/var/www/po-copilot',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
      },
    },
  ],
};
