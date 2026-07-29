module.exports = {
  apps: [
    {
      name: 'po-copilot-api',
      script: 'tsx',
      args: 'scripts/api-server.ts',
      cwd: '/var/www/po-copilot',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
    },
  ],
};
