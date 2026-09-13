import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || '127.0.0.1',
    hmr: process.env.TAURI_DEV_HOST ? { protocol: 'ws', host: process.env.TAURI_DEV_HOST, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] }
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
