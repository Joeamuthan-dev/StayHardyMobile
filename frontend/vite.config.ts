// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Works for both Capacitor and Vercel
    emptyOutDir: true,
  },
  // Base URL for web deployment
  base: '/',
});
