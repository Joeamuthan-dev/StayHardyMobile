// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Works for both Capacitor and Vercel
    emptyOutDir: true,
    // Target modern browsers/WebViews for smaller output
    target: 'es2020',
    // Remove console.log in production for cleaner performance
    rollupOptions: {
      treeshake: true,
    },
  },
  // Base URL for web deployment
  base: '/',
});
