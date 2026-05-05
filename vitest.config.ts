import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/test/**', 'src/components/ui/**', 'src/app/layout.tsx', 'src/app/page.tsx', 'e2e/**'],
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    exclude: ['e2e/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
});
