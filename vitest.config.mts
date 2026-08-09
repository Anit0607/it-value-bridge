import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    // Mirror the `@/*` alias from tsconfig.json so tests import modules exactly
    // the way application code does, rather than forcing source files to use
    // relative paths just to be testable.
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    include: ['lib/**/*.test.ts'],
  },
});
