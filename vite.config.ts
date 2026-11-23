import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '');
  const analyticsEnabled = command === 'build' && env.CONTEXT === 'production' && env.BRANCH === 'main';
  return {
    plugins: [react()],
    optimizeDeps: { include:['three'] },
    build: { rollupOptions: { input: { main:'index.html', arCamera:'ar-camera.html' } } },
    define: {
      __VPA_BUILD_INFO__: JSON.stringify({
        commit: /^[a-f0-9]{40}$/.test(env.COMMIT_REF ?? '') ? env.COMMIT_REF : null,
        context: ['production', 'deploy-preview', 'branch-deploy'].includes(env.CONTEXT) ? env.CONTEXT : 'local',
        branch: env.BRANCH === 'main' ? 'main' : 'nonproduction',
        analytics_build_enabled: analyticsEnabled,
      }),
      __VPA_ANALYTICS_PRODUCTION__: JSON.stringify(analyticsEnabled),
    },
  };
});
