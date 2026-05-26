import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

const certPath = path.resolve(__dirname, 'certs/limy24.x-peng.com.pem')
const keyPath = path.resolve(__dirname, 'certs/limy24.x-peng.com-key.pem')
const hasLocalCerts = fs.existsSync(certPath) && fs.existsSync(keyPath)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    ...(hasLocalCerts
      ? {
          https: {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
          },
          port: 443,
          host: '0.0.0.0',
          hmr: {
            host: 'limy24.x-peng.com',
            port: 443,
          },
        }
      : {}),
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
})
