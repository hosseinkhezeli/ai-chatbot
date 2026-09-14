import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const root = __dirname;

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['**/e2e/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'vitest.setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/e2e/**',
        '.next/**',
        'tests/**',
      ],
    },
  },
  resolve: {
    alias: [
      { find: /^@\/db$/, replacement: path.resolve(root, './lib/db') },
      { find: /^@\/db\/(.*)$/, replacement: path.resolve(root, './lib/db/$1') },
      { find: /^@\/lib\/auth$/, replacement: path.resolve(root, './lib/auth') },
      { find: /^@\/lib\/auth\/(.*)$/, replacement: path.resolve(root, './lib/auth/$1') },
      { find: /^@\/auth$/, replacement: path.resolve(root, './lib/auth') },
      { find: /^@\/auth\/(.*)$/, replacement: path.resolve(root, './lib/auth/$1') },
      { find: /^@\/app\/(.*)$/, replacement: path.resolve(root, './src/app/$1') },
      { find: /^@agent$/, replacement: path.resolve(root, './lib/agent') },
      { find: /^@agent\/(.*)$/, replacement: path.resolve(root, './lib/agent/$1') },
      { find: /^@ai$/, replacement: path.resolve(root, './lib/ai') },
      { find: /^@ai\/(.*)$/, replacement: path.resolve(root, './lib/ai/$1') },
      { find: /^@\/(.*)$/, replacement: path.resolve(root, './src/$1') },
      { find: /^@$/, replacement: path.resolve(root, './src') },
    ],
  },
});