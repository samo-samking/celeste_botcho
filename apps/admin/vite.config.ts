import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = __dirname;

export default defineConfig({
  root,
  envDir: resolve(root, '../..'),
  resolve: {
    alias: { '@celeste/shared': resolve(root, '../../packages/shared/src') },
  },
  server: { port: 5174 },
  build: { outDir: 'dist', emptyOutDir: true },
});
