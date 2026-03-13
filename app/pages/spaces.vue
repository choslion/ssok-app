<template>
  <div class="spaces-page">

    <!-- 페이지 헤더 -->
    <div class="spaces-page__header">
      <h1 class="spaces-page__title">보관 장소</h1>
      <p class="spaces-page__subtitle">공간별로 물건을 찾아보세요.</p>
    </div>

    <!-- 로딩 -->
    <p v-if="loading" class="spaces-status" aria-live="polite">불러오는 중…</p>

    <template v-else>

      <!-- ── 공간 카드 그리드 ─────────────────────────────────────────── -->
      <ul v-if="allSpaces.length" class="space-list" aria-label="보관 장소 목록">
        <li v-for="sp in allSpaces" :key="sp.name">
          <button
            type="button"
            class="space-card"
            :class="{
              'space-card--unclassified': sp.unclassified,
              'space-card--selected': selectedSpace === sp.name,
            }"
            :aria-pressed="selectedSpace === sp.name"
            :aria-label="`${sp.name}, ${sp.count}개 항목`"
            @click="toggleSpace(sp.name)"
          >
            <div class="space-card__icon" aria-hidden="true">
              <svg v-if="!sp.unclassified" width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                <path d="M3 7l9-4 9 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 2"/>
                <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="space-card__body">
              <span class="space-card__name">{{ sp.name }}</span>
              <span class="space-card__count">{{ sp.count }}개</span>
            </div>
          </button>
        </li>
      </ul>

      <!-- 공간이 아예 없을 때 -->
      <p v-else class="spaces-status">이 공간에 등록된 물건이 없어요.</p>

    </template>

    <!-- ── 바텀 시트 ──────────────────────────────────────────────────── -->
    <SpaceSheet
      :open="sheetOpen"
      :space-name="selectedSpace ?? ''"
      :items="filteredItems"
      @close="closeSheet"
    />
  </div>
</template>

<script setup lang="ts">
useHead({ title: '공간 · SSOK' })
import type { Item } from '~~/shared/types/ssok'

// ── 상수 ──────────────────────────────────────────────────────────────────────

const DEFAULT_SPACES = ['거실', '주방', '안방', '욕실', '현관', '창고', '서재'] as const

// ── 데이터 로딩 (메타데이터만 — 블롭 미로딩) ─────────────────────────────────

const { items, loadItems } = useItems()
const loading = ref(true)
const route = useRoute()
const router = useRouter()

onMounted(async () => {
  await loadItems()
  loading.value = false

  // 아이템 상세에서 돌아온 경우 — 이전 공간 드로어 복원
  const spaceQuery = route.query.space as string | undefined
  if (spaceQuery) {
    toggleSpace(spaceQuery)
    // toggleSpace 내부에서 router.replace로 URL을 동기화하므로 별도 처리 불필요
  }
})

// ── 공간 선택 / 시트 상태 ─────────────────────────────────────────────────────

const selectedSpace = ref<string | null>(null)
const sheetOpen = ref(false)

function toggleSpace(name: string): void {
  selectedSpace.value = name
  sheetOpen.value = true
  // 히스토리 스택 쌓지 않고 URL 쿼리만 교체
  router.replace({ path: '/spaces', query: { space: name } })
}

function closeSheet(): void {
  sheetOpen.value = false
  selectedSpace.value = null
  router.replace({ path: '/spaces' })
}

// ── 공간 목록 + 카운트 ────────────────────────────────────────────────────────
// space 인덱스(T4.1)로 향후 getAllFromIndex 가능. 현재는 메모리 필터로 카운트.

interface SpaceEntry {
  name: string
  count: number
  unclassified: boolean
}

const allSpaces = computed<SpaceEntry[]>(() => {
  const defaults = new Set<string>(DEFAULT_SPACES)

  const result: SpaceEntry[] = (DEFAULT_SPACES as readonly string[]).map(name => ({
    name,
    count: items.value.filter(i => i.space === name).length,
    unclassified: false,
  }))

  // 사용자 정의 공간
  const customSeen = new Set<string>()
  for (const item of items.value) {
    if (item.space && !defaults.has(item.space) && !customSeen.has(item.space)) {
      customSeen.add(item.space)
      result.push({
        name: item.space,
        count: items.value.filter(i => i.space === item.space).length,
        unclassified: false,
      })
    }
  }

  // 미분류: 공간 미지정 항목이 있을 때만 표시
  const unclassifiedCount = items.value.filter(i => !i.space).length
  if (unclassifiedCount > 0) {
    result.push({ name: '미분류', count: unclassifiedCount, unclassified: true })
  }

  return result
})

// ── 필터된 항목 ───────────────────────────────────────────────────────────────
// 블롭 로딩 없음 — useItems의 items는 메타데이터만 포함.

const filteredItems = computed<Item[]>(() => {
  if (selectedSpace.value === null) return []
  if (selectedSpace.value === '미분류') return items.value.filter(i => !i.space)
  return items.value.filter(i => i.space === selectedSpace.value)
})

</script>

<style scoped lang="scss">
.spaces-page {
  // iOS 홈 인디케이터 영역 + 고정 하단 내비게이션 겹침 방지
  padding-bottom: calc(var(--space-7) + env(safe-area-inset-bottom, 0px));

  &__header {
    margin-bottom: var(--space-6);
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 var(--space-1);
  }

  &__subtitle {
    font-size: 0.875rem;
    color: var(--color-sub);
    margin: 0;
  }
}

.spaces-status {
  font-size: 0.9375rem;
  color: var(--color-sub);
  text-align: center;
  padding: var(--space-8) var(--space-4);
  margin: 0;
}

// ── 공간 카드 그리드 ──────────────────────────────────────────────────────────

.space-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-6);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);

  @media (min-width: 480px) { grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 768px) { grid-template-columns: repeat(4, 1fr); }
}

.space-card {
  width: 100%;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: box-shadow var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast);

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0); }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  // 선택됨
  &--selected {
    border-color: var(--color-primary);
    background: rgba(255, 107, 0, 0.04);

    .space-card__name { color: var(--color-primary); }
    .space-card__count { font-weight: 600; }
  }

  // 미분류
  &--unclassified {
    background: var(--color-bg);
    border-color: var(--color-border);
    box-shadow: none;
    border-style: dashed;

    .space-card__icon { color: var(--color-sub); }
    .space-card__name { color: var(--color-sub); }

    &.space-card--selected {
      border-color: var(--color-primary);
      border-style: dashed;
      .space-card__name { color: var(--color-primary); }
    }
  }

  &__icon {
    color: var(--color-primary);
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }
  &__body { display: flex; flex-direction: column; gap: var(--space-1); }
  &__name { font-size: 1rem; font-weight: 600; color: var(--color-text); }
  &__count { font-size: 0.8125rem; color: var(--color-sub); }
}

// ── 항목 섹션 ──────────────────────────────────────────────────────────────────

.item-section {
  // 고정 헤더/상단 여백을 확보하기 위한 스크롤 기준점 오프셋
  scroll-margin-top: 1rem;

  // 포커스 시 기본 outline 제거 (tabindex="-1"은 프로그래밍 포커스용)
  &:focus { outline: none; }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  &__close {
    font-size: 0.8125rem;
    font-family: inherit;
    color: var(--color-sub);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
    transition: color var(--transition-fast);

    &:hover { color: var(--color-text); }
    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &__empty {
    font-size: 0.9375rem;
    color: var(--color-sub);
    text-align: center;
    padding: var(--space-7) var(--space-4);
    margin: 0;
  }
}

// ── 항목 카드 목록 ────────────────────────────────────────────────────────────

.card-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

// ── 항목 카드 (index.vue .card 와 동일 구조) ──────────────────────────────────

.item-card {
  display: block;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  box-shadow: var(--shadow-card);
  border: 1px solid transparent;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

  &:hover {
    border-color: rgba(255, 107, 0, 0.25);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);
  }
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  &__name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    margin: 0;
  }

  &__badge {
    flex-shrink: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--badge-color, var(--color-primary));
    background: var(--badge-bg, rgba(255, 107, 0, 0.1));
    padding: 2px var(--space-2);

    &--receipt  { --badge-color: #0369A1; --badge-bg: #E0F2FE; }
    &--warranty { --badge-color: #2F9E44; --badge-bg: #EBFBEE; }
    &--manual   { --badge-color: #7950F2; --badge-bg: #F3F0FF; }
    border-radius: var(--radius-full);
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.8125rem;
    color: var(--color-sub);
    margin-bottom: var(--space-3);
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  &__warranty {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);

    &--normal  { color: #2F9E44; background: #EBFBEE; }
    &--soon    { color: #E8590C; background: #FFF4E6; }
    &--expired { color: #868E96; background: #F1F3F5; }
  }

  &__amount {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }
}
</style>
