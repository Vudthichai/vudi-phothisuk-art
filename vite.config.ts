import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '');
  const arExperimentsEnabled = env.CONTEXT !== 'production';
  const analyticsEnabled = command === 'build' && env.CONTEXT === 'production' && env.BRANCH === 'main';
  return {
    plugins: [react()],
    resolve:{alias: arExperimentsEnabled?[]:[{find:/^\.\/experimental\/recognition$/,replacement:decodeURIComponent(new URL('./src/ar/experimental/disabled.ts',import.meta.url).pathname)}]},
    optimizeDeps: { include:['three'] },
    build: { rollupOptions: { input: { main:'index.html', arCamera:'ar-camera.html', rainforestV5:'rainforest-v5.html', ...(arExperimentsEnabled?{rainforest:'rainforest-ar.html',rainforestV2:'rainforest-v2.html',rainforestV3:'rainforest-v3.html',rainforestV4:'rainforest-v4.html',tigerRecognition:'tiger-lily-ar.html',certificateARHub:'forest-certificate-ar.html',msatAR:'msat-ar.html'}:{}) } } },
    define: {
      __VPA_AR_EXPERIMENTS__: JSON.stringify(arExperimentsEnabled),
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
