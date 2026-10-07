import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  // En desarrollo, /api se redirige al servidor (rama programa/servidor). En producción define VITE_API_URL.
  server: {
    proxy: {
      '/api': process.env.VITE_PROXY_API ?? 'http://localhost:5126',
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
