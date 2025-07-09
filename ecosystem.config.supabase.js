module.exports = {
  apps: [{
    name: 'tradechat-supabase',
    script: './server/index-supabase.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1, // Supabase Realtime 사용으로 클러스터링 불필요
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    time: true
  }]
};