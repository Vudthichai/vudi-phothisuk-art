import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import forestDevPlugin from './scripts/forest-dev-plugin.mjs';
export default defineConfig({ plugins: [react(), forestDevPlugin()] });
