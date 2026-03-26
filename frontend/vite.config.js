import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  envDir: '../',
  plugins: [react()],
  assetsInclude: ['**/*.bat'],
  server: {
    host: true,  
    port: 5174,  
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://backend:8001', // 👈 SEM OPÇÕES, SÓ O BACKEND!
        changeOrigin: true,
        secure: false,
      }
    }
  }
})