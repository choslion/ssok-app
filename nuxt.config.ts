// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@vite-pwa/nuxt'],

  app: {
    head: {
      htmlAttrs: { lang: 'ko' },
      title: 'SSOK — 내 디지털 서랍',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      meta: [
        { name: 'description', content: 'SSOK — 영수증·보증서·설명서를 사진으로 찍어 디지털 서랍에 보관하는 무료 앱. OCR 자동 인식, 보증 만료 D-Day 알림, 완전한 개인정보 보호.' },
        { property: 'og:site_name', content: 'SSOK' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'SSOK — 영수증·보증서·설명서를 한 곳에' },
        { property: 'og:description', content: 'SSOK — 영수증·보증서·설명서를 사진으로 찍어 디지털 서랍에 보관하는 무료 앱. OCR 자동 인식, 보증 만료 D-Day 알림, 완전한 개인정보 보호.' },
        // og:image 는 절대 URL이 필요하므로 커스텀 도메인 연결 후 교체
        { property: 'og:image', content: '/pwa-512x512.png' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: 'SSOK — 영수증·보증서·설명서를 한 곳에' },
        { name: 'twitter:description', content: 'SSOK — 영수증·보증서·설명서를 사진으로 찍어 디지털 서랍에 보관하는 무료 앱.' },
      ],
      script: [
        // Schema.org SoftwareApplication — AEO/AI 답변 엔진용 (정적 HTML에 구워짐)
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'SSOK',
            alternateName: '쏙',
            description: '종이 영수증·보증서·설명서를 사진으로 찍어 스마트폰에 쏙! 보관하는 디지털 서랍 앱.',
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Web Browser, iOS, Android',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
            featureList: [
              '영수증 OCR 자동 인식',
              '보증 만료 D-Day 알림',
              '오프라인 사용 가능 (PWA)',
              '로컬 데이터 백업 및 복원',
              '장소별 보관함 관리',
            ],
            inLanguage: 'ko',
            isAccessibleForFree: true,
          }),
        },
        // Schema.org FAQPage — 자주 묻는 질문 (AEO용)
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'SSOK은 무엇인가요?',
                acceptedAnswer: { '@type': 'Answer', text: 'SSOK(쏙)은 종이 영수증, 보증서, 설명서를 사진으로 찍어 스마트폰에 디지털로 보관하는 무료 앱입니다.' },
              },
              {
                '@type': 'Question',
                name: '데이터는 어디에 저장되나요?',
                acceptedAnswer: { '@type': 'Answer', text: '모든 데이터는 내 기기(브라우저 저장소)에만 저장됩니다. 외부 서버로 전송되지 않습니다.' },
              },
              {
                '@type': 'Question',
                name: '오프라인에서도 사용할 수 있나요?',
                acceptedAnswer: { '@type': 'Answer', text: 'SSOK은 PWA(Progressive Web App)로 홈 화면에 설치하면 인터넷 없이도 사용할 수 있습니다.' },
              },
              {
                '@type': 'Question',
                name: '보증서 만료일을 어떻게 관리하나요?',
                acceptedAnswer: { '@type': 'Answer', text: '항목 추가 시 보증 만료일을 입력하면, 30일 전부터 보증 알림 탭에서 D-Day로 알려드립니다.' },
              },
            ],
          }),
        },
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
