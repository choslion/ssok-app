<template>
  <div class="app-layout">
    <NuxtRouteAnnouncer />

    <header class="app-header">
      <div class="page-container app-header__inner">
        <NuxtLink to="/" class="app-header__logo" aria-label="홈으로 이동">SSOK</NuxtLink>
        <span class="app-header__tagline">종이는 버리고, 정보만 쏙!</span>
      </div>
    </header>

    <main class="app-main">
      <div class="page-container">
        <NuxtPage />
      </div>
    </main>

    <!-- 하단 탭 내비게이션 -->
    <nav class="tab-bar" aria-label="앱 내비게이션">
      <NuxtLink
        to="/"
        class="tab-bar__tab"
        :class="{ 'tab-bar__tab--active': route.path === '/' }"
        aria-label="홈"
      >
        <svg class="tab-bar__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 10L12 3l9 7v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 21V13h6v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="tab-bar__label">홈</span>
      </NuxtLink>

      <NuxtLink
        to="/spaces"
        class="tab-bar__tab"
        :class="{ 'tab-bar__tab--active': route.path === '/spaces' }"
        aria-label="보관함"
      >
        <svg class="tab-bar__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M3 7l9-4 9 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="tab-bar__label">보관함</span>
      </NuxtLink>

      <NuxtLink
        to="/add"
        class="tab-bar__tab tab-bar__tab--add"
        aria-label="새 항목 추가"
      >
        <span class="tab-bar__add-btn" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="display:block">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      </span>
      </NuxtLink>

      <NuxtLink
        to="/expiring"
        class="tab-bar__tab"
        :class="{ 'tab-bar__tab--active': route.path === '/expiring' }"
        aria-label="보증 알림"
      >
        <svg class="tab-bar__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
          <path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="tab-bar__label">보증 알림</span>
      </NuxtLink>

      <NuxtLink
        to="/settings"
        class="tab-bar__tab"
        :class="{ 'tab-bar__tab--active': route.path === '/settings' }"
        aria-label="설정"
      >
        <svg class="tab-bar__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="tab-bar__label">설정</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
</script>

<style scoped lang="scss">
.app-layout {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
}

// ── Header ──────────────────────────────────────────────────────────────────
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-height);
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);

  &__inner {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 100%;
  }

  &__logo {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-primary);
    letter-spacing: -0.02em;
    text-decoration: none;
    flex-shrink: 0;
    &:hover { opacity: 0.8; }
  }

  &__tagline {
    font-size: 0.75rem;
    color: var(--color-sub);

    @media (max-width: 360px) {
      display: none;
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
.app-main {
  flex: 1;
  padding-top: var(--space-5);
  // Reserve space for tab bar + safe area + breathing room
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + var(--space-6));
}

// ── Bottom Tab Bar ───────────────────────────────────────────────────────────
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;

  display: flex;
  align-items: center;
  height: calc(60px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);

  background: var(--color-surface);
  // Use box-shadow instead of border-top so overflow: visible still shows elevated button
  box-shadow: 0 -1px 0 var(--color-border), 0 -4px 16px rgba(0, 0, 0, 0.04);
  overflow: visible;

  &__tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: var(--space-2) 0;
    color: var(--color-sub);
    text-decoration: none;
    transition: color var(--transition-fast);
    min-height: 44px; // accessible tap target

    &--active {
      color: var(--color-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
      border-radius: var(--radius-sm);
    }

    // Elevated center add button
    &--add {
      position: relative;
      margin-top: -20px; // lift above tab bar
      flex-direction: row; // override — no label, just the circle
      gap: 0;
    }
  }

  &__icon {
    display: block;
  }

  &__label {
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.01em;
  }

  &__add-btn {
    display: flex;
    align-items: center;
    justify-content: center;

    width: 54px;
    height: 54px;
    border-radius: var(--radius-full);

    background: var(--color-primary);
    color: var(--color-btn-text);

    box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.40);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);

    .tab-bar__tab--add:hover & {
      transform: scale(1.06);
      box-shadow: 0 6px 20px rgba(var(--color-primary-rgb), 0.50);
    }

    .tab-bar__tab--add:active & {
      transform: scale(0.95);
    }

    .tab-bar__tab--add:focus-visible & {
      outline: 3px solid rgba(var(--color-primary-rgb), 0.40);
      outline-offset: 3px;
    }
  }
}
</style>
