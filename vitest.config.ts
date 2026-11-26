import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    test: {
      globals: true,
      environment: 'node',
      env: env,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        reportsDirectory: './coverage',
        include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
