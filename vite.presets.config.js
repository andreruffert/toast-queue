import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

const presets = [
  resolve(__dirname, 'src/presets/minimal.css'),
  resolve(__dirname, 'src/presets/stacked.css'),
];

export default defineConfig({
  build: {
    outDir: 'dist/presets',
    cssMinify: false,
    rollupOptions: {
      input: presets,
      output: {
        assetFileNames: () => '[name][extname]',
      },
    },
  },
});
