import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts'],
      exclude: ['src/engine/index.ts', 'src/engine/**/*.test.ts', 'src/engine/__tests__/**'],
      thresholds: {
        lines: 90,
      },
    },
  },
});
