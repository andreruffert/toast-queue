import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(__dirname, 'docs'),
  resolve: {
    alias: {
      // Map '@themes' to the 'src/themes' folder located outside 'docs'
      '@presets': resolve(__dirname, 'src/presets'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist/docs'),
  },
});
