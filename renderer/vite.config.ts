import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public', // ✅ 显式声明
  build: {
    outDir: '../dist/renderer',
    emptyOutDir: false,
  },
  plugins: [react()],
});
