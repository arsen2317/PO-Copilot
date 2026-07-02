module.exports = {
  apps: [
    {
      name: 'po-copilot-api',
      script: 'npx',
      args: 'tsx scripts/dev-api-server.ts',
      cwd: '/var/www/po-copilot',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
      },
    },
  ],
};
