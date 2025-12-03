module.exports = {
  apps: [
    {
      name: 'paymonth-nextjs',
      script: 'npm',
      args: 'start',
      cwd: '/home/phoubon-test-paymonth/htdocs/test-paymonth.phoubon.in.th',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 9102,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 9102,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 9102,
      },
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      exec_mode: 'fork',
    },
  ],

  deploy: {
    production: {
      user: 'phoubon-suphot',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/suphotsudsee/paymonth-nextjs.git',
      path: '/home/phoubon-test-paymonth/htdocs/test-paymonth.phoubon.in.th',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};