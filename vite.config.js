import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { archiveHtml } from './build/archive-html.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), archiveHtml(loadEnv(mode, '.', 'VITE_').VITE_SITE_URL)],
}))
