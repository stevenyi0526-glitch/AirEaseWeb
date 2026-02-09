import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend API URL — defaults to localhost for dev, override via env for cloud
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['airease.ai', 'www.airease.ai'],
    proxy: {
      '/v1': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/docs': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/health': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
})
