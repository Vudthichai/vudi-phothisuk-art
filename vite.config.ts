import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      __VPA_ANALYTICS_PRODUCTION__: JSON.stringify(command === 'build' && env.CONTEXT === 'production' && env.BRANCH === 'main'),
    },
  };
});
