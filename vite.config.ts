import { defineConfig } from 'vite';

export default defineConfig({
  base: '/FlatEarth2D/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
