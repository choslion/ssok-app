<template>
  <div class="expiring-page">

    <div class="expiring-page__header">
      <div class="expiring-page__title-row">
        <h1 class="expiring-page__title">만료 임박</h1>
        <span v-if="!loading && expiring.length" class="expiring-page__count-badge" aria-label="만료 임박 항목 수">{{ expiring.length }}개</span>
      </div>
      <p class="expiring-page__sub">보증 기간이 30일 이내에 끝나는 항목입니다.</p>
    </div>

    <!-- 로딩 -->
    <div v-if="loading" class="state-placeholder" aria-live="polite">
      불러오는 중…
    </div>

    <!-- 빈 상태 -->
    <div v-else-if="!expiring.length" class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="40" height="36" rx="5" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
          <path d="M8 20h40" stroke="currentColor" stroke-width="2.4"/>
          <path d="M18 10V6M38 10V6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M20 31l5 5 11-10" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="empty-state__title">만료가 가까운 항목이 없어요</p>
      <p class="empty-state__hint">보증 기간이 30일 이내로 남은 항목이 없어요.</p>
      <NuxtLink to="/" class="empty-state__link">전체 항목 보기</NuxtLink>
    </div>

    <!-- 카드 목록 -->
    <div v-else ref="cardListRef" class="sections">

      <!-- 긴급 섹션 (D-0 ~ D-7) -->
      <section v-if="urgentItems.length" aria-labelledby="section-urgent">
        <h2 id="section-urgent" class="section-heading section-heading--urgent">
          <span class="section-heading__dot" aria-hidden="true"></span>
          긴급
          <span class="section-heading__count" aria-label="긴급 항목 수">{{ urgentItems.length }}개</span>
        </h2>
        <ul class="card-list" aria-label="긴급 만료 항목 목록">
          <li v-for="item in urgentItems" :key="item.id" class="card-list__item">
            <ItemCard :item="item" :to="{ path: '/item/' + item.id, query: { from: 'expiring' } }">
              <template #badge>
                <span class="d-badge d-badge--urgent" :aria-label="dBadgeLabel(item.warrantyUntil!)">
                  {{ dBadgeText(item.warrantyUntil!) }}
                </span>
              </template>
              <template #footer-left>
                <span class="expiry-label">
                  만료일: <strong>{{ formatDate(item.warrantyUntil!) }}</strong>
                </span>
              </template>
            </ItemCard>
          </li>
        </ul>
      </section>

      <!-- 주의 섹션 (D-8 ~ D-30) -->
      <section v-if="warnItems.length" aria-labelledby="section-warn">
        <h2 id="section-warn" class="section-heading section-heading--warn">
          <span class="section-heading__dot" aria-hidden="true"></span>
          주의
          <span class="section-heading__count" aria-label="주의 항목 수">{{ warnItems.length }}개</span>
        </h2>
        <ul class="card-list" aria-label="주의 만료 항목 목록">
          <li v-for="item in warnItems" :key="item.id" class="card-list__item">
            <ItemCard :item="item" :to="{ path: '/item/' + item.id, query: { from: 'expiring' } }">
              <template #badge>
                <span class="d-badge d-badge--warn" :aria-label="dBadgeLabel(item.warrantyUntil!)">
                  {{ dBadgeText(item.warrantyUntil!) }}
                </span>
              </template>
              <template #footer-left>
                <span class="expiry-label">
                  만료일: <strong>{{ formatDate(item.warrantyUntil!) }}</strong>
                </span>
              </template>
            </ItemCard>
          </li>
        </ul>
      </section>

    </div>

  </div>
</template>

<script setup lang="ts">
useHead({ title: '보증 알림 · SSOK' })
import type { Item } from '~~/shared/types/ssok'
import { formatDate } from '~~/shared/utils/format'

const { items, loadItems } = useItems()
const { markSeen } = useExpiryNotice()
const loading = ref(true)
const cardListRef = ref<HTMLElement | null>(null)
const { runEntrance: runCardEntrance } = useCardEntrance(cardListRef, '.card-list__item')

onMounted(async () => {
  markSeen()
  await loadItems()
  loading.value = false

  if (expiring.value.length) await runCardEntrance()
})

// ── 필터 + 정렬 ──────────────────────────────────────────────────────────────

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

const urgentItems = computed<Item[]>(() => expiring.value.filter(i => diffDays(i.warrantyUntil!) <= 7))
const warnItems   = computed<Item[]>(() => expiring.value.filter(i => diffDays(i.warrantyUntil!) > 7))

// ── D-배지 텍스트 ──────────────────────────────────────────────────────────────

function dBadgeText(endDate: string): string {
  const d = diffDays(endDate)
  return d === 0 ? '오늘 만료' : `D-${d}`
}

function dBadgeLabel(endDate: string): string {
  const d = diffDays(endDate)
  return d === 0 ? '오늘 만료' : `만료까지 ${d}일`
}

</script>

<style scoped lang="scss">
.expiring-page {
  padding-bottom: var(--space-7);

  &__header {
    margin-bottom: var(--space-5);
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
  }

  &__count-badge {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--color-orange-text);
    background: var(--color-orange-tint);
    border: 1px solid var(--color-orange-border);
    border-radius: var(--radius-full);
    padding: 2px var(--space-2);
    line-height: 1.4;
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
    color: var(--color-primary);
    line-height: 1;

    svg { display: block; }
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

// ── 섹션 ──────────────────────────────────────────────────────────────────────

.sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.section-heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-bottom: var(--space-3);

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__count {
    font-weight: 500;
    margin-left: auto;
  }

  &--urgent {
    color: #C92A2A;
    .section-heading__dot { background: #C92A2A; }
    .section-heading__count { color: #C92A2A; }
  }

  &--warn {
    color: #E8590C;
    .section-heading__dot { background: #E8590C; }
    .section-heading__count { color: #E8590C; }
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
