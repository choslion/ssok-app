<template>
  <div class="expiring-page">

    <div class="expiring-page__header">
      <h1 class="expiring-page__title">만료 임박</h1>
      <p class="expiring-page__sub">보증 기간이 30일 이내에 끝나는 항목입니다.</p>
    </div>

    <!-- 로딩 -->
    <div v-if="loading" class="state-placeholder" aria-live="polite">
      불러오는 중…
    </div>

    <!-- 빈 상태 -->
    <div v-else-if="!expiring.length" class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">✅</p>
      <p class="empty-state__title">만료 임박 항목이 없습니다.</p>
      <p class="empty-state__hint">보증 기간이 30일 이상 남은 항목만 있거나, 아직 항목을 추가하지 않으셨어요.</p>
      <NuxtLink to="/" class="empty-state__link">전체 목록 보기</NuxtLink>
    </div>

    <!-- 카드 목록 -->
    <ul v-else ref="cardListRef" class="card-list" aria-label="만료 임박 항목 목록">
      <li v-for="item in expiring" :key="item.id" class="card-list__item">
        <ItemCard :item="item" :to="{ path: '/item/' + item.id, query: { from: 'expiring' } }">
          <template #badge>
            <span
              class="d-badge"
              :class="diffDays(item.warrantyUntil!) <= 7 ? 'd-badge--urgent' : 'd-badge--warn'"
            >D-{{ diffDays(item.warrantyUntil!) }}</span>
          </template>
          <template #footer-left>
            <span class="expiry-label">
              만료일: <strong>{{ formatDate(item.warrantyUntil!) }}</strong>
            </span>
          </template>
        </ItemCard>
      </li>
    </ul>

  </div>
</template>

<script setup lang="ts">
useHead({ title: '만료 · SSOK' })
import type { Item } from '~~/shared/types/ssok'
import { formatDate, formatAmount } from '~~/shared/utils/format'

const { items, loadItems } = useItems()
const loading = ref(true)
const cardListRef = ref<HTMLElement | null>(null)
const { runEntrance: runCardEntrance } = useCardEntrance(cardListRef, ':scope > .card-list__item')

onMounted(async () => {
  await loadItems()
  loading.value = false

  // 카드 stagger 진입 애니메이션
  if (expiring.value.length) await runCardEntrance()
})

// ── 필터 + 정렬 ──────────────────────────────────────────────────────────────
// 만료일까지 0–30일 남은 항목만, 오름차순(가장 임박한 순)

function diffDays(endDate: string): number {
  return Math.floor((new Date(endDate).getTime() - Date.now()) / 86_400_000)
}

const expiring = computed<Item[]>(() =>
  items.value
    .filter(item => {
      if (!item.warrantyUntil) return false
      const d = diffDays(item.warrantyUntil)
      return d >= 0 && d <= 30
    })
    .sort((a, b) =>
      new Date(a.warrantyUntil!).getTime() - new Date(b.warrantyUntil!).getTime()
    )
)

</script>

<style scoped lang="scss">
.expiring-page {
  padding-bottom: var(--space-7);

  &__header {
    margin-bottom: var(--space-5);
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 800;
    color: var(--color-text);
    margin-bottom: var(--space-1);
  }

  &__sub {
    font-size: 0.875rem;
    color: var(--color-sub);
  }
}

// ── 상태 플레이스홀더 ──────────────────────────────────────────────────────────

.state-placeholder {
  text-align: center;
  padding: var(--space-7) 0;
  color: var(--color-sub);
  font-size: 0.9375rem;
}

// ── 빈 상태 ──────────────────────────────────────────────────────────────────

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-7) var(--space-5);
  gap: var(--space-3);

  &__icon {
    font-size: 2.5rem;
    line-height: 1;
  }

  &__title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__hint {
    font-size: 0.875rem;
    color: var(--color-sub);
    max-width: 245px;
    line-height: 1.6;
  }

  &__link {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
    padding: var(--space-2) var(--space-4);
    border: 1.5px solid var(--color-primary);
    border-radius: var(--radius-full);
    transition: background var(--transition-fast);
    &:hover { background: rgba(255, 107, 0, 0.06); }
  }
}

// ── 카드 목록 ─────────────────────────────────────────────────────────────────

.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

// ── D-배지 ────────────────────────────────────────────────────────────────────

.d-badge {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 3px var(--space-2);
  border-radius: var(--radius-full);
  letter-spacing: 0.01em;

  // D-8 ~ D-30: 주황
  &--warn {
    color: #E8590C;
    background: #FFF4E6;
  }

  // D-0 ~ D-7: 빨강 (긴급)
  &--urgent {
    color: #C92A2A;
    background: #FFF5F5;
  }
}

// ── 만료일 라벨 ───────────────────────────────────────────────────────────────

.expiry-label {
  font-size: 0.8125rem;
  color: var(--color-sub);

  strong {
    color: var(--color-text);
    font-weight: 600;
  }
}
</style>
