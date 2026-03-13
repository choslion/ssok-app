<template>
  <div class="list-page">

    <!-- 검색 / 정렬 툴바 -->
    <div class="toolbar">
      <div class="toolbar__search-wrap">
        <span class="toolbar__search-icon" aria-hidden="true">🔍</span>
        <input
          v-model="search"
          class="toolbar__search"
          type="search"
          placeholder="제품명, 구매처 검색"
          aria-label="항목 검색"
        />
        <button
          v-if="search"
          class="toolbar__clear"
          aria-label="검색어 지우기"
          @click="search = ''"
        >✕</button>
      </div>
      <select v-model="sortOrder" class="toolbar__sort" aria-label="정렬 기준">
        <option value="newest">최신순</option>
        <option value="oldest">오래된순</option>
        <option value="name">이름순</option>
      </select>
    </div>

    <!-- 종류 필터 칩 -->
    <div v-if="types.length > 1" class="chips" role="group" aria-label="종류 필터">
      <button
        class="chip"
        :class="{ 'chip--active': !activeType }"
        @click="activeType = null"
      >전체</button>
      <button
        v-for="t in types"
        :key="t"
        class="chip"
        :class="{ 'chip--active': activeType === t }"
        @click="activeType = t"
      >{{ TYPE_LABELS[t] }}</button>
    </div>

    <!-- 카드 목록 -->
    <ul v-if="filtered.length" ref="cardListRef" class="card-list" aria-label="항목 목록">
      <li v-for="item in filtered" :key="item.id" class="card-list__item">
        <ItemCard :item="item" :to="'/item/' + item.id" />
      </li>
    </ul>

    <!-- 검색 결과 없음 -->
    <div v-else-if="search || activeType" class="empty-state">
      <p class="empty-state__text">검색 결과가 없습니다.</p>
      <button class="empty-state__reset" @click="resetFilter">전체 보기</button>
    </div>

    <!-- 첫 방문 빈 상태 -->
    <div v-else-if="!loading" class="empty-state">
      <p class="empty-state__tagline">서랍 속 골칫거리 영수증과 설명서,<br>내 폰 안에 쏙!</p>
      <p class="empty-state__hint">우측 하단 + 버튼을 눌러 첫 항목을 추가해 보세요.</p>
    </div>

  </div>

  <!-- ── 첫 방문 인트로 오버레이 ──────────────────────────────────────────── -->
  <Teleport to="body">
    <div
      v-if="showIntro"
      ref="introOverlayRef"
      class="intro-overlay"
    >
      <div class="intro-content">
        <div class="intro-drawer-icon" aria-hidden="true">📦</div>
        <p class="intro-title">쏙</p>
        <p class="intro-sub">종이는 버리고, 정보만 쏙!</p>
      </div>
      <button
        ref="introSkipBtnRef"
        type="button"
        class="intro-skip"
        aria-label="인트로 건너뛰기"
        @click="skipIntro"
      >건너뛰기</button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
useHead({ title: '홈 · SSOK' })
import type { Item, ItemDocType } from '~~/shared/types/ssok'
import { TYPE_LABELS, formatDate, formatAmount, warrantyStatus } from '~~/shared/utils/format'

// loadItems()는 items store 메타데이터만 읽음 — Blob 로드 없음
const { items, loadItems } = useItems()
const loading = ref(true)
const cardListRef = ref<HTMLElement | null>(null)

// ── 첫 방문 인트로 ────────────────────────────────────────────────────────────
// window 플래그 — 새로고침(새 window 컨텍스트)시 초기화, SPA 탭 탐색 시 유지
type AppWindow = typeof window & { __ssokIntroPlayed?: boolean }

const showIntro = ref(false)
const introOverlayRef = ref<HTMLElement | null>(null)
const introSkipBtnRef = ref<HTMLButtonElement | null>(null)
let introTimeline: { kill: () => void } | null = null

function skipIntro(): void {
  introTimeline?.kill()
  introTimeline = null
  showIntro.value = false
}

async function playIntro(): Promise<void> {
  showIntro.value = true
  await nextTick()
  if (!introOverlayRef.value) { showIntro.value = false; return }
  try {
    const { gsap } = await import('gsap')
    introSkipBtnRef.value?.focus()
    const overlay = introOverlayRef.value
    const icon  = overlay.querySelector<HTMLElement>('.intro-drawer-icon')
    const title = overlay.querySelector<HTMLElement>('.intro-title')
    const sub   = overlay.querySelector<HTMLElement>('.intro-sub')

    const tl = gsap.timeline({ onComplete: () => { showIntro.value = false } })
    introTimeline = tl

    // 1단계: 아이콘 스케일 인 (back.out 이징으로 통통 튀는 느낌, 0.25s)
    if (icon) tl.from(icon, { scale: 0.5, opacity: 0, duration: 0.25, ease: 'back.out(1.5)' })
    // 2단계: 타이틀 + 서브 슬라이드 업 stagger (이전 트윈과 0.05초 오버랩, 0.26s)
    const textEls = [title, sub].filter(Boolean) as HTMLElement[]
    if (textEls.length) {
      tl.from(textEls, { opacity: 0, y: 14, duration: 0.2, stagger: 0.06, ease: 'power2.out' }, '-=0.05')
    }
    // 3단계: 잠깐 머문 뒤 위로 슬라이드 아웃 (total ≈ 1.1s)
    tl.to(overlay, { y: '-100%', duration: 0.42, ease: 'power2.inOut' }, '+=0.15')
  } catch {
    // GSAP 로드 실패 — 오버레이 즉시 제거 (페일세이프)
    showIntro.value = false
  }
}

onMounted(async () => {
  // SPA 탭 복귀 시 재재생 안 함 — 리로드 시에만 재생
  let ranIntro = false
  if (import.meta.client && !(window as AppWindow).__ssokIntroPlayed) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ;(window as AppWindow).__ssokIntroPlayed = true  // 먼저 설정 (reduced-motion 사용자 포함)
    if (!reduced) {
      ranIntro = true
      playIntro()  // loadItems와 병렬 실행 (await 하지 않음)
    }
  }

  await loadItems()
  loading.value = false

  // 카드 stagger 진입 애니메이션 — 인트로 재생 시에는 생략 (인트로가 입장 연출 담당)
  if (import.meta.client && filtered.value.length && !ranIntro) {
    const { gsap } = await import('gsap')
    await nextTick()
    const cards = cardListRef.value?.querySelectorAll(':scope > .card-list__item')
    if (cards?.length) {
      gsap.from(cards, {
        opacity: 0,
        y: 14,
        duration: 0.25,
        stagger: 0.04,
        ease: 'power2.out',
      })
    }
  }
})

onUnmounted(() => {
  // 페이지 이탈 시 진행 중인 인트로 정리
  introTimeline?.kill()
  introTimeline = null
})

// ── 검색 / 필터 / 정렬 ──────────────────────────────────────────────────────

const search = ref('')
const sortOrder = ref<'newest' | 'oldest' | 'name'>('newest')
const activeType = ref<ItemDocType | null>(null)

const types = computed<ItemDocType[]>(() => {
  const set = new Set<ItemDocType>()
  for (const item of items.value) set.add(item.type)
  return [...set].sort()
})

const filtered = computed<Item[]>(() => {
  const q = search.value.trim().toLowerCase()

  let result = items.value.filter(item => {
    if (activeType.value && item.type !== activeType.value) return false
    if (q) {
      const inTitle = item.title.toLowerCase().includes(q)
      const inStore = (item.store ?? '').toLowerCase().includes(q)
      if (!inTitle && !inStore) return false
    }
    return true
  })

  result = [...result].sort((a, b) => {
    if (sortOrder.value === 'newest') return (a.purchaseDate ?? '') < (b.purchaseDate ?? '') ? 1 : -1
    if (sortOrder.value === 'oldest') return (a.purchaseDate ?? '') > (b.purchaseDate ?? '') ? 1 : -1
    return a.title.localeCompare(b.title, 'ko')
  })

  return result
})

function resetFilter(): void {
  search.value = ''
  activeType.value = null
}


</script>

<style scoped lang="scss">
.list-page {
  padding-bottom: var(--space-7);
}

// ── 툴바 ──────────────────────────────────────────────────────────────────────

.toolbar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  align-items: center;

  &__search-wrap {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  &__search-icon {
    position: absolute;
    left: var(--space-3);
    font-size: 0.875rem;
    pointer-events: none;
  }

  &__search {
    width: 100%;
    padding: var(--space-3) var(--space-4) var(--space-3) calc(var(--space-3) * 2 + 1rem);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-full);
    font-size: 0.9375rem;
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-surface);
    transition: border-color var(--transition-fast);
    appearance: none;

    &::placeholder { color: var(--color-sub); }
    &:focus { outline: none; border-color: var(--color-primary); }
    &::-webkit-search-cancel-button { display: none; }
  }

  &__clear {
    position: absolute;
    right: var(--space-3);
    font-size: 0.75rem;
    color: var(--color-sub);
    padding: var(--space-1);
    transition: color var(--transition-fast);
    &:hover { color: var(--color-text); }
  }

  &__sort {
    flex-shrink: 0;
    padding: var(--space-2) var(--space-3);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-full);
    font-size: 0.8125rem;
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-surface);
    cursor: pointer;
    appearance: none;
    &:focus { outline: none; border-color: var(--color-primary); }
  }
}

// ── 카테고리 칩 ───────────────────────────────────────────────────────────────

.chips {
  display: flex;
  gap: var(--space-2);
  flex-wrap: nowrap;
  overflow-x: auto;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-1);
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.chip {
  flex-shrink: 0;
  padding: var(--space-1) var(--space-3);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-family: inherit;
  color: var(--color-sub);
  background: var(--color-surface);
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);

  &--active {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(255, 107, 0, 0.06);
    font-weight: 600;
  }
}

// ── 카드 목록 ─────────────────────────────────────────────────────────────────

.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

// ── 첫 방문 인트로 오버레이 ───────────────────────────────────────────────────

.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.intro-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
  pointer-events: none;
}

.intro-drawer-icon {
  width: 64px;
  height: 64px;
  background: var(--color-primary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.875rem;
  margin-bottom: var(--space-1);
}

.intro-title {
  font-size: 2.25rem;
  font-weight: 900;
  color: var(--color-primary);
  letter-spacing: -0.03em;
  margin: 0;
  line-height: 1;
}

.intro-sub {
  font-size: 0.9375rem;
  color: var(--color-sub);
  margin: 0;
}

.intro-skip {
  position: absolute;
  top: var(--space-5);
  right: var(--space-5);
  font-size: 0.8125rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--color-sub);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast);

  &:hover { color: var(--color-text); border-color: var(--color-sub); }
  &:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
}

// ── 빈 상태 ──────────────────────────────────────────────────────────────────

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-7) var(--space-5);
  text-align: center;
  gap: var(--space-4);

  &__tagline {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.6;
  }

  &__hint {
    font-size: 0.875rem;
    color: var(--color-sub);
  }

  &__text {
    font-size: 0.9375rem;
    color: var(--color-sub);
  }

  &__reset {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
    padding: var(--space-2) var(--space-4);
    border: 1.5px solid var(--color-primary);
    border-radius: var(--radius-full);
    font-family: inherit;
    cursor: pointer;
    transition: background var(--transition-fast);
    &:hover { background: rgba(255, 107, 0, 0.06); }
  }
}
</style>
