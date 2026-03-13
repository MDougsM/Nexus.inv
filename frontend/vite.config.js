import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.bat'],
  server: {
    host: true,  // Faz a mesma coisa que o --host (libera pra rede)
    port: 5174,  // Força a porta 5174
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.PROXY_TARGET || 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})