import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import mkcert from 'vite-plugin-mkcert'
import fs from 'fs'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  preview: {
    port: 3000,
    strictPort: true,
  },
  server: {
    https: {
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem'),
    },
    strictPort: true,
    port: 3000,
    host: '0.0.0.0',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'], // optional: for global test setup
  },
})
