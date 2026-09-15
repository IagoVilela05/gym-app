import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'GymProg — Treinos & Progressão',
        short_name: 'GymProg',
        description: 'Acompanhe seus treinos, registre cargas e visualize seu progresso.',
        theme_color: '#0d0d0f',
        background_color: '#0d0d0f',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
