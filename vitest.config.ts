import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/cypress/**', '**/test/concurrency.test.ts', '**/test/impulsive.test.ts', '**/.{idea,git,cache,output,temp}/**'],
    coverage: {
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/test/**', 'src/components/ui/**', 'src/app/layout.tsx', 'src/app/page.tsx'],
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
