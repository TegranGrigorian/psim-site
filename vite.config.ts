import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

// base './' so the static build works from GitHub Pages sub-paths or any static host.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), how: resolve(__dirname, 'how.html') } },
  },
});
