import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const distDir = path.resolve(rootDir, '../dist');

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@dist': distDir
    }
  },
  server: {
    host: '0.0.0.0',
    fs: {
      allow: ['..', distDir]
    }
  },
  build: {
    target: 'es2019',
    sourcemap: true,
    assetsInlineLimit: 0
  }
});
