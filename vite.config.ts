import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const isGitHubPages = process.env.GITHUB_PAGES === 'true'
const base = isGitHubPages ? '/PWA-FINAN-AS-MOBILE/' : '/'

export default defineConfig({
  base,
  // __APP_VERSION__ é substituído em build time pelo timestamp ISO
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Controle Financeiro',
        short_name: 'Finanças',
        description: 'Controle financeiro pessoal completo',
        theme_color: '#4f46e5',
        background_color: '#1e1b4b',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Remove caches de versões anteriores automaticamente ao ativar o novo SW
        cleanupOutdatedCaches: true,
        // Não pré-cacheamos o HTML para que o browser sempre busque versão fresca
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // Fallback offline: serve index.html para qualquer rota de navegação
        navigateFallback: 'index.html',
        // Não aplicar fallback a rotas de API ou arquivos com extensão
        navigateFallbackDenylist: [/^\/__/, /\/[^/?]+\.[^/]+$/],
      },
    }),
  ],
})
