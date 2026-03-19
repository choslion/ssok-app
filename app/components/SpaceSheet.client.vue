<template>
  <Teleport to="body">

    <!-- ── 배경 딤 오버레이 ───────────────────────────────────────────── -->
    <Transition name="t-overlay">
      <div
        v-if="open"
        class="sheet-overlay"
        aria-hidden="true"
        @click="handleClose"
      />
    </Transition>

    <!-- ── 바텀 시트 ─────────────────────────────────────────────────── -->
    <Transition name="t-sheet">
      <div
        v-if="open"
        ref="sheetEl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="HEADING_ID"
        class="sheet"
        :class="{ 'sheet--expanded': expanded, 'sheet--dragging': dragY !== null }"
        :style="dragY !== null ? { transform: `translateY(${dragY}px)` } : undefined"
      >
        <!-- 드래그 핸들 -->
        <div
          class="sheet__handle-wrap"
          aria-hidden="true"
          @pointerdown="onHandlePointerDown"
        >
          <span class="sheet__handle" :class="{ 'sheet__handle--wiggle': handleWiggling }" />
        </div>

        <!-- 고정 헤더 -->
        <div class="sheet__header">
          <h2 :id="HEADING_ID" class="sheet__title">
            {{ spaceName }}
            <span class="sheet__count">({{ items.length }})</span>
          </h2>
          <button
            ref="closeBtnEl"
            type="button"
            class="sheet__close"
            aria-label="서랍 닫기"
            @click="handleClose"
          >✕</button>
        </div>

        <!-- 스크롤 가능한 항목 목록 -->
        <div class="sheet__body">
          <ul
            v-if="items.length"
            ref="listEl"
            class="sheet__list"
            :aria-label="`${spaceName} 항목 목록`"
          >
            <li v-for="item in items" :key="item.id">
              <ItemCard
                name-tag="h3"
                :item="item"
                :to="{ path: '/item/' + item.id, query: { from: 'spaces', space: spaceName } }"
              />
            </li>
          </ul>
          <p v-else class="sheet__empty">이 공간에 저장된 항목이 없어요.</p>
        </div>
      </div>
    </Transition>

  </Teleport>
</template>

<script setup lang="ts">
import type { Item } from '~~/shared/types/ssok'

// ── Props / Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  open: boolean
  spaceName: string
  items: Item[]
}>()

const emit = defineEmits<{ close: [] }>()

// ── 상수 ──────────────────────────────────────────────────────────────────────

const HEADING_ID = 'sheet-heading'

// ── Refs ──────────────────────────────────────────────────────────────────────

const sheetEl    = ref<HTMLElement | null>(null)
const closeBtnEl = ref<HTMLButtonElement | null>(null)
const listEl     = ref<HTMLElement | null>(null)

const { runEntrance: runListEntrance } = useCardEntrance(listEl, ':scope > li')

// 시트가 열릴 때마다 항목 목록에 stagger 진입 애니메이션 적용
watch(() => props.open, (isOpen) => { if (isOpen) runListEntrance() })

// 닫힌 후 포커스를 돌려줄 트리거 요소
const returnFocusEl = ref<HTMLElement | null>(null)

// 확장 상태 — useState로 네비게이션 이탈/복귀 시에도 유지
const expanded = useState<boolean>('sheet-expanded', () => false)

// 자동 확장 여부 — true이면 52vh detent에서 콘텐츠가 항상 잘림
// → 핸들을 내릴 때 52vh 중간 detent 건너뛰고 바로 닫기
const autoExpanded = useState<boolean>('sheet-autoExpanded', () => false)

// 핸들 위글 (자동 확장 시 시각 피드백)
const handleWiggling = ref(false)

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// 열린 직후 콘텐츠가 52vh 에서 잘리면 자동 확장
function checkAutoExpand(): void {
  if (!sheetEl.value) return
  const bodyEl = sheetEl.value.querySelector<HTMLElement>('.sheet__body')
  if (!bodyEl) return
  if (bodyEl.scrollHeight > bodyEl.clientHeight) {
    expanded.value  = true
    autoExpanded.value = true
    // 자동 확장에만 피드백 — reduced-motion 존중
    if (!prefersReducedMotion()) {
      handleWiggling.value = true
      setTimeout(() => { handleWiggling.value = false }, 500)
    }
  } else {
    autoExpanded.value = false
  }
}

// ── 드래그 (Step B) ────────────────────────────────────────────────────────

// 드래그 중 translateY 오프셋 (px). null이면 비활성.
const dragY = ref<number | null>(null)
let dragStartY = 0

function onHandlePointerDown(e: PointerEvent): void {
  // 마우스 우클릭 무시
  if (e.button !== 0 && e.pointerType === 'mouse') return
  const handle = e.currentTarget as HTMLElement
  handle.setPointerCapture(e.pointerId)
  dragStartY = e.clientY
  dragY.value = 0

  handle.addEventListener('pointermove', onPointerMove)
  handle.addEventListener('pointerup',   onPointerUp,   { once: true })
  handle.addEventListener('pointercancel', onPointerUp, { once: true })
}

function onPointerMove(e: PointerEvent): void {
  const delta = e.clientY - dragStartY
  // 위 방향은 expanded 상태에서만 허용 (기본 높이에서 더 위로 못 끌게)
  if (!expanded.value) {
    dragY.value = Math.max(0, delta)   // 아래 방향만
  } else {
    dragY.value = delta                // 위 아래 모두
  }
}

function onPointerUp(e: PointerEvent): void {
  const handle = e.currentTarget as HTMLElement
  handle.removeEventListener('pointermove', onPointerMove)

  const delta = dragY.value ?? 0
  dragY.value = null  // 트랜지션 복원

  if (!expanded.value) {
    if (delta > 80)        handleClose()           // 충분히 내리면 닫기
    else if (delta < -60)  expanded.value = true   // 충분히 올리면 확장
    // 그 외: 원래 위치 복귀 (CSS transition이 처리)
  } else {
    if (delta > 80) {
      // 자동 확장 상태: 52vh가 어차피 잘리므로 바로 닫기
      // 수동 확장 상태: 52vh 기본 detent로 복귀
      if (autoExpanded.value) handleClose()
      else                    expanded.value = false
    }
    // 그 외: 확장 유지
  }
}

// ── 열기 / 닫기 + Step C ──────────────────────────────────────────────────────

function handleClose(): void {
  expanded.value  = false
  autoExpanded.value = false
  emit('close')
}

// 배경 잠금: 헤더 + 메인만 inert — tab-bar(z-index:200)는 열어 둠
const BG_SELECTORS = ['.app-header', '.app-main']

// iOS에서 body overflow:hidden 시 스크롤 위치가 날아가는 문제 방지
// 열 때: scrollY 저장 + body position:fixed, 닫을 때: 복원 + scrollTo
let savedScrollY = 0

function lockBackground(): void {
  for (const sel of BG_SELECTORS) {
    const el = document.querySelector<HTMLElement>(sel)
    if (el) {
      el.setAttribute('inert', '')
      el.setAttribute('aria-hidden', 'true')
    }
  }
  savedScrollY = window.scrollY
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${savedScrollY}px`
  document.body.style.width = '100%'
}

function unlockBackground(): void {
  for (const sel of BG_SELECTORS) {
    const el = document.querySelector<HTMLElement>(sel)
    if (el) {
      el.removeAttribute('inert')
      el.removeAttribute('aria-hidden')
    }
  }
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.width = ''
  window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior })
}

// 포커스 트랩: 시트 안의 focusable 요소를 순환
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function onFocusTrap(e: KeyboardEvent): void {
  if (e.key !== 'Tab' || !sheetEl.value) return
  const focusable = Array.from(sheetEl.value.querySelectorAll<HTMLElement>(FOCUSABLE))
  if (focusable.length === 0) return
  const first = focusable[0]
  const last  = focusable[focusable.length - 1]
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus() }
  }
}

function onDocKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') handleClose()
  onFocusTrap(e)
}

// open이 false→true로 바뀔 때 (정상 열기)
watch(() => props.open, async (val) => {
  if (val) {
    returnFocusEl.value = document.activeElement as HTMLElement
    lockBackground()
    await nextTick()
    if (!expanded.value) checkAutoExpand()
    closeBtnEl.value?.focus()
    document.addEventListener('keydown', onDocKeydown)
  } else {
    document.removeEventListener('keydown', onDocKeydown)
    unlockBackground()
    returnFocusEl.value?.focus()
    returnFocusEl.value = null
  }
})

// 네비게이션 복귀 시 open이 처음부터 true인 경우 watch가 발화하지 않으므로 별도 처리
onMounted(async () => {
  if (props.open) {
    lockBackground()
    await nextTick()
    if (!expanded.value) checkAutoExpand()
    closeBtnEl.value?.focus()
    document.addEventListener('keydown', onDocKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onDocKeydown)
  unlockBackground()
})

</script>

<style scoped lang="scss">
// ── 오버레이 ──────────────────────────────────────────────────────────────────

.sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  // 탭 바 높이(60px) + iOS 홈 인디케이터 safe area — 탭 바 영역은 딤 처리 제외
  bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;

  // 오버레이 페이드 트랜지션
  &.t-overlay-enter-active,
  &.t-overlay-leave-active { transition: opacity 0.28s ease; }
  &.t-overlay-enter-from,
  &.t-overlay-leave-to     { opacity: 0; }

  @media (prefers-reduced-motion: reduce) {
    &.t-overlay-enter-active,
    &.t-overlay-leave-active { transition: none; }
  }
}

// ── 시트 ──────────────────────────────────────────────────────────────────────

.sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 101;
  height: 52vh;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  transition: height 0.3s cubic-bezier(0.32, 0.72, 0, 1);

  &--expanded {
    height: 100dvh;
    border-radius: 0;
  }

  // 시트 슬라이드 트랜지션
  &.t-sheet-enter-active,
  &.t-sheet-leave-active {
    transition:
      transform 0.32s cubic-bezier(0.32, 0.72, 0, 1),
      height    0.3s  cubic-bezier(0.32, 0.72, 0, 1);
  }
  &.t-sheet-enter-from,
  &.t-sheet-leave-to { transform: translateY(100%); }

  // 드래그 중 — 트랜지션 끄고 즉각 반응
  &--dragging {
    transition: none !important;
    user-select: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &.t-sheet-enter-active,
    &.t-sheet-leave-active { transition: none; }
  }
}

// ── 핸들 ──────────────────────────────────────────────────────────────────────

.sheet__handle-wrap {
  display: flex;
  justify-content: center;
  padding: var(--space-3) 0 var(--space-2);
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;     // Step B: 기본 스크롤 동작 차단 (핸들 전용)
  user-select: none;

  &:active { cursor: grabbing; }
}

.sheet__handle {
  width: 40px;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;

  &--wiggle {
    animation: handle-wiggle 0.45s ease-in-out;
  }
}

@keyframes handle-wiggle {
  0%   { transform: scaleX(1);    opacity: 1; }
  20%  { transform: scaleX(0.65); opacity: 0.6; }
  50%  { transform: scaleX(1.2);  opacity: 1; }
  75%  { transform: scaleX(0.85); }
  100% { transform: scaleX(1); }
}

// ── 헤더 ──────────────────────────────────────────────────────────────────────

.sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-5) var(--space-3);
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
}

.sheet__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.sheet__count {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--color-sub);
  margin-left: var(--space-1);
}

.sheet__close {
  font-size: 1rem;
  font-family: inherit;
  color: var(--color-sub);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  transition: color var(--transition-fast), background var(--transition-fast);

  &:hover { color: var(--color-text); background: var(--color-bg); }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

// ── 스크롤 바디 ───────────────────────────────────────────────────────────────

.sheet__body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  // 탭 바(60px) + iOS 홈 인디케이터 safe area 확보 → 마지막 항목이 탭 바에 가려지지 않도록
  padding: var(--space-4) var(--space-4) calc(60px + var(--space-4) + env(safe-area-inset-bottom, 0px));
  overscroll-behavior: contain;
}

.sheet__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sheet__empty {
  font-size: 0.9375rem;
  color: var(--color-sub);
  text-align: center;
  padding: var(--space-7) var(--space-4);
  margin: 0;
}

</style>
