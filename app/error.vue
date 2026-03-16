<template>
  <div class="error-page" :class="`error-page--${is404 ? '404' : 'unknown'}`">

    <div class="error-page__card" role="main">

      <!-- 브랜드 -->
      <p class="error-page__brand" aria-label="SSOK 앱">SSOK</p>

      <!-- 아이콘 -->
      <div class="error-page__icon" aria-hidden="true">
        <!-- 404: 빈 서랍 / 찾을 수 없음 -->
        <svg v-if="is404" width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="20" width="48" height="38" rx="4" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
          <path d="M12 32h48" stroke="currentColor" stroke-width="3"/>
          <path d="M28 20v-6a8 8 0 0 1 16 0v6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <circle cx="36" cy="46" r="3" fill="currentColor"/>
          <path d="M36 38v4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <!-- 기타 오류: 경고 -->
        <svg v-else width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M34.268 12.5a2 2 0 0 1 3.464 0l28.2 48.8A2 2 0 0 1 64.2 64H7.8a2 2 0 0 1-1.732-3L34.268 12.5z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
          <path d="M36 28v16" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="36" cy="51" r="2.5" fill="currentColor"/>
        </svg>
      </div>

      <!-- 상태 코드 -->
      <p v-if="statusCode" class="error-page__code" aria-label="`오류 코드 ${statusCode}`">
        {{ statusCode }}
      </p>

      <!-- 제목 -->
      <h1 class="error-page__title">{{ title }}</h1>

      <!-- 설명 -->
      <p class="error-page__desc">{{ desc }}</p>

      <!-- 액션 버튼 -->
      <div class="error-page__actions" role="group" :aria-label="'오류 복구 옵션'">

        <button
          type="button"
          class="err-btn err-btn--primary"
          @click="goHome"
        >
          홈으로 돌아가기
        </button>

        <button
          type="button"
          class="err-btn err-btn--secondary"
          @click="secondaryAction"
        >
          {{ secondaryLabel }}
        </button>

      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps({
  error: Object as PropType<NuxtError>,
})

const router = useRouter()

const statusCode = computed(() => props.error?.statusCode ?? null)
const is404      = computed(() => statusCode.value === 404)

const title = computed(() =>
  is404.value
    ? '페이지를 찾을 수 없어요'
    : '예기치 않은 오류가 발생했어요'
)

const desc = computed(() =>
  is404.value
    ? '요청한 페이지가 존재하지 않거나 이동되었어요.\n홈으로 돌아가서 다시 찾아보세요.'
    : '일시적인 문제가 발생했어요.\n잠시 후 다시 시도하거나 홈으로 돌아가세요.'
)

const secondaryLabel = computed(() => is404.value ? '이전으로' : '다시 시도')

async function goHome(): Promise<void> {
  await clearError({ redirect: '/' })
}

function secondaryAction(): void {
  if (is404.value) {
    router.back()
  } else {
    // 현재 URL 재로딩 — clearError가 state를 초기화하고 리디렉트함
    if (import.meta.client) window.location.reload()
  }
}
</script>

<style scoped lang="scss">
// ── 전체 화면 레이아웃 ─────────────────────────────────────────────────────────

.error-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background-color: var(--color-bg);
}

// ── 카드 ──────────────────────────────────────────────────────────────────────

.error-page__card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-7) var(--space-5) var(--space-6);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

// ── 브랜드 ────────────────────────────────────────────────────────────────────

.error-page__brand {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--color-primary);
  text-transform: uppercase;
  margin-bottom: var(--space-1);
}

// ── 아이콘 ────────────────────────────────────────────────────────────────────

.error-page__icon {
  color: var(--color-primary);
  margin-bottom: var(--space-2);

  svg {
    display: block;
  }
}

// ── 상태 코드 ─────────────────────────────────────────────────────────────────

.error-page__code {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.08);
  padding: 2px var(--space-3);
  border-radius: var(--radius-full);
  letter-spacing: 0.04em;
}

// ── 텍스트 ────────────────────────────────────────────────────────────────────

.error-page__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.4;
  margin-top: var(--space-1);
}

.error-page__desc {
  font-size: 0.9375rem;
  color: var(--color-sub);
  line-height: 1.65;
  white-space: pre-line; // \n 줄바꿈 지원
  margin-bottom: var(--space-2);
}

// ── 버튼 그룹 ─────────────────────────────────────────────────────────────────

.error-page__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
}

// ── 버튼 공통 ─────────────────────────────────────────────────────────────────

.err-btn {
  width: 100%;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-full);
  font-size: 0.9375rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: none;
  transition: opacity var(--transition-fast), background var(--transition-fast);

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 3px;
  }

  &:active { opacity: 0.82; }

  // 주 액션 — 포인트 컬러 채움
  &--primary {
    background: var(--color-primary);
    color: var(--color-btn-text);

    &:hover { opacity: 0.88; }
  }

  // 보조 액션 — 테두리 스타일
  &--secondary {
    background: transparent;
    color: var(--color-sub);
    border: 1.5px solid var(--color-border);

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }
}

// ── 모바일 대응 ───────────────────────────────────────────────────────────────

@media (max-width: 400px) {
  .error-page__card {
    border-radius: var(--radius-md);
    padding: var(--space-6) var(--space-4);
  }

  .error-page__title {
    font-size: 1.125rem;
  }
}
</style>
