import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Firebase Hosting はルート(/)配信のため base はデフォルトのまま。
export default defineConfig({
  plugins: [react()],
})
