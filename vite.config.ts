import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Relative base keeps assets working on GitHub Pages project sites
// (https://<user>.github.io/<repo>/) as well as at a domain root.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: false },
});
