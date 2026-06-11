import { defineConfig } from 'vitest/config';

// tsconfig の paths（@/ エイリアス）を Vite ネイティブ機能で解決する
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
});
