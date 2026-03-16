<template>
  <header class="page-header">
    <button
      type="button"
      class="page-header__back"
      aria-label="뒤로 가기"
      @click="handleBack"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <h1 v-if="title" class="page-header__title">{{ title }}</h1>
    <div v-else class="page-header__spacer" aria-hidden="true" />

    <div class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string
  back?: string | (() => void)
}>()

const router = useRouter()

function handleBack(): void {
  if (typeof props.back === 'function') {
    props.back()
  } else if (typeof props.back === 'string') {
    router.push(props.back)
  } else {
    router.back()
  }
}
</script>

<style scoped lang="scss">
.page-header {
  position: sticky;
  top: var(--header-height);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  // Break out of page-container horizontal padding for full-width background
  margin-left: calc(-1 * var(--space-4));
  margin-right: calc(-1 * var(--space-4));
  padding: var(--space-2) var(--space-4);
  margin-bottom: var(--space-4);
  background: rgba(248, 249, 250, 0.95);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  &__back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: var(--radius-sm);
    color: var(--color-sub);
    transition: background-color var(--transition-fast), color var(--transition-fast);

    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: var(--color-text);
    }

    &:active {
      background: rgba(0, 0, 0, 0.10);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &__title {
    flex: 1;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  &__spacer {
    flex: 1;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }
}
</style>
