// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@vite-pwa/nuxt'],

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon',  href: '/favicon.ico' },
      ],
    },
  },

  // Static site generation (SSG) — deployed to S3 + CloudFront
  ssr: false,

  css: ['~/assets/scss/main.scss'],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/tokens.scss" as *;',
        },
      },
    },
  },

  pwa: {
    registerType: 'autoUpdate',

    manifest: {
      name: 'SSOK',
      short_name: 'SSOK',
      description: '종이는 버리고, 정보만 쏙!',
      theme_color: '#FF6B00',
      background_color: '#F8F9FA',
      display: 'standalone',
      start_url: '/',
      lang: 'ko',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    },

    workbox: {
      // Cache all static assets; navigateFallback handles SPA routing
      globPatterns: ['**/*.{js,css,html,png,ico,svg,woff2}'],
      navigateFallback: '/',
    },

    // devOptions: enable in dev only when testing PWA install prompt
    devOptions: {
      enabled: false,
    },
  },
})
