// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable for production to reduce size
  },
  // ✅ Add base path if deploying to subdirectory (optional)
  // base: '/',
})