import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Required so asset paths resolve inside the Capacitor WebView (file/capacitor URL).
  base: './',
})
