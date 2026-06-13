import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages(プロジェクトページ)では /LPsim/ 配下に配信されるため、
// 本番ビルド時のみ base を /LPsim/ にする（ローカル開発は / のまま）。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/LPsim/' : '/',
  plugins: [react()],
}))
