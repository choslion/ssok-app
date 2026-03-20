<template>
  <div
    class="att-swiper"
    role="region"
    :aria-label="ariaLabel ?? '첨부 파일 뷰어'"
    tabindex="0"
    @keydown.left.prevent="prev"
    @keydown.right.prevent="next"
  >
    <!-- ── 슬라이드 트랙 ─────────────────────────────────── -->
    <div ref="trackRef" class="att-swiper__track" @scroll.passive="onScroll">
      <div
        v-for="(slide, i) in slides"
        :key="slide.id"
        class="att-swiper__slide"
        role="group"
        aria-roledescription="슬라이드"
        :aria-label="`${i + 1}번 파일, 전체 ${slides.length}개`"
        :inert="i !== current || undefined"
      >
        <!-- 이미지 -->
        <template v-if="slide.kind === 'image'">
          <div class="att-swiper__img-wrap">
            <button
              class="att-swiper__img-btn"
              :aria-label="`${slide.label} 확대 보기`"
              :data-slide-id="slide.id"
                @click="openLightbox(slide, $event.currentTarget as HTMLElement)"
            >
              <img
                :src="slide.url"
                :alt="slide.label"
                class="att-swiper__img"
                draggable="false"
              />
            </button>
          </div>
          <!-- 회전/크롭 등 컨트롤 — img-wrap 밖에 배치해 고정 높이에 가려지지 않음 -->
          <!-- v-if 대신 CSS opacity로 fade — Transition+v-if는 빠른 current 변경 시 끊김 -->
          <div
            class="att-swiper__controls"
            :class="{ 'att-swiper__controls--inactive': i !== current }"
            :aria-hidden="i !== current ? 'true' : undefined"
          >
            <slot name="controls" :slide="slide" :index="i" :active="i === current" />
          </div>
        </template>

        <!-- PDF -->
        <div v-else-if="slide.kind === 'pdf'" class="att-swiper__pdf-wrap">
          <iframe
            :src="slide.url"
            class="att-swiper__pdf"
            :title="slide.label"
          />
          <a
            :href="slide.url"
            target="_blank"
            rel="noopener"
            class="att-swiper__pdf-link"
          >새 탭에서 열기</a>
        </div>
      </div>
    </div>

    <!-- ── 좌우 화살표 (단일 파일이면 숨김) ─────────────── -->
    <template v-if="slides.length > 1">
      <button
        class="att-swiper__arrow att-swiper__arrow--prev"
        :disabled="current === 0"
        aria-label="이전 파일"
        @click="prev"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button
        class="att-swiper__arrow att-swiper__arrow--next"
        :disabled="current === slides.length - 1"
        aria-label="다음 파일"
        @click="next"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </template>

    <!-- ── 페이지네이션 (숫자) ────────────────────────────── -->
    <div
      v-if="slides.length > 1"
      class="att-swiper__pagination"
      aria-live="polite"
      aria-atomic="true"
    >
      <span class="att-swiper__count">{{ current + 1 }} / {{ slides.length }}</span>
    </div>
  </div>

  <!-- ── 라이트박스 모달 ────────────────────────────────────── -->
  <Teleport to="body">
    <div
      v-if="lightbox"
      ref="lbRef"
      class="lb"
      role="dialog"
      aria-modal="true"
      :aria-label="`${lightbox.label} 확대 보기`"
      @click.self="closeLightbox"
      @keydown.escape="closeLightbox"
      @keydown.tab.prevent="trapFocus"
    >
      <button ref="lbCloseRef" class="lb__close" aria-label="닫기" @click="closeLightbox">✕</button>
      <div
        class="lb__img-wrap"
        @click="closeLightbox"
        @touchstart.passive="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <img
          :src="lightbox.url"
          :alt="lightbox.label"
          class="lb__img"
          :style="imgTransformStyle"
          draggable="false"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
export interface SwiperSlide {
  id: string
  url: string
  kind: 'image' | 'pdf'
  label: string
}

const props = withDefaults(
  defineProps<{
    slides: SwiperSlide[]
    modelValue?: number
    ariaLabel?: string
  }>(),
  { modelValue: 0 },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const current = computed(() => props.modelValue)
const trackRef = ref<HTMLDivElement | null>(null)

// ── 이동 ─────────────────────────────────────────────────────

let rafId: number | null = null

/** ease-out quad */
function easeOut(t: number): number { return 1 - (1 - t) * (1 - t) }

/** 화살표 클릭 시 200ms RAF 애니메이션으로 이동 */
function animateScroll(targetLeft: number): void {
  if (!trackRef.value) return
  const track = trackRef.value
  const from = track.scrollLeft
  const delta = targetLeft - from
  if (delta === 0) return

  if (rafId !== null) cancelAnimationFrame(rafId)
  const DURATION = 200
  const startTime = performance.now()

  function step(now: number): void {
    if (!trackRef.value) return
    const t = Math.min((now - startTime) / DURATION, 1)
    trackRef.value.scrollLeft = from + delta * easeOut(t)
    if (t < 1) rafId = requestAnimationFrame(step)
    else rafId = null
  }
  rafId = requestAnimationFrame(step)
}

function goTo(index: number, instant = false): void {
  if (!trackRef.value) return
  const targetLeft = index * trackRef.value.clientWidth
  if (instant) {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    trackRef.value.scrollLeft = targetLeft
  } else {
    animateScroll(targetLeft)
  }
  emit('update:modelValue', index)
}

function prev(): void {
  if (current.value > 0) goTo(current.value - 1)
}

function next(): void {
  if (current.value < props.slides.length - 1) goTo(current.value + 1)
}

// ── 스크롤 동기화 (사용자 스와이프 감지) ────────────────────
// scrollend 지원 브라우저: 즉시 감지 / 미지원(Safari <17): 30ms debounce 폴백

let scrollTimer: ReturnType<typeof setTimeout> | null = null
let useScrollEnd = false

function syncIndex(): void {
  if (!trackRef.value) return
  const { scrollLeft, clientWidth } = trackRef.value
  if (!clientWidth) return
  const clamped = Math.max(0, Math.min(props.slides.length - 1, Math.round(scrollLeft / clientWidth)))
  if (clamped !== current.value) emit('update:modelValue', clamped)
}

function onScroll(): void {
  // 스와이프 중 50% 지점 통과하는 즉시 인덱스 업데이트 → 컨트롤 즉각 전환
  syncIndex()
  // scrollend 미지원 브라우저: snap 완료 후 최종 위치 재확인
  if (!useScrollEnd) {
    if (scrollTimer) clearTimeout(scrollTimer)
    scrollTimer = setTimeout(syncIndex, 50)
  }
}

// ── 외부 v-model 변경 시 스크롤 위치 동기화 ─────────────────

watch(
  () => props.modelValue,
  (newVal) => {
    if (!trackRef.value) return
    const { scrollLeft, clientWidth } = trackRef.value
    if (!clientWidth) return
    const visibleIndex = Math.round(scrollLeft / clientWidth)
    if (visibleIndex !== newVal) goTo(newVal, true)
  },
)

// ── 마운트 시 초기 위치 + scrollend 등록 ─────────────────────

onMounted(() => {
  nextTick(() => {
    if (!trackRef.value) return
    if (props.modelValue > 0) {
      trackRef.value.scrollLeft = props.modelValue * trackRef.value.clientWidth
    }
    if ('onscrollend' in trackRef.value) {
      useScrollEnd = true
      trackRef.value.addEventListener('scrollend', syncIndex)
    }
  })
})

onUnmounted(() => {
  if (scrollTimer) clearTimeout(scrollTimer)
  if (rafId !== null) cancelAnimationFrame(rafId)
  if (useScrollEnd) trackRef.value?.removeEventListener('scrollend', syncIndex)
})

// ── 라이트박스 ───────────────────────────────────────────────

const lightbox    = ref<SwiperSlide | null>(null)
const lbRef       = ref<HTMLElement | null>(null)
const lbCloseRef  = ref<HTMLButtonElement | null>(null)
let   lbTrigger: HTMLElement | null = null   // 열기 전 포커스 위치 기억
let   lbScrollY = 0

function lockScroll(): void {
  lbScrollY = window.scrollY
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${lbScrollY}px`
  document.body.style.width = '100%'
}

function unlockScroll(): void {
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.width = ''
  window.scrollTo({ top: lbScrollY, behavior: 'instant' as ScrollBehavior })
}

function openLightbox(slide: SwiperSlide, trigger: HTMLElement): void {
  lbTrigger = trigger
  lightbox.value = slide
  lbScale.value = 1
  lbOriginX.value = 0
  lbOriginY.value = 0
  lockScroll()
  nextTick(() => lbCloseRef.value?.focus())   // 모달 열리면 닫기 버튼으로 포커스 이동
}

function closeLightbox(): void {
  lightbox.value = null
  unlockScroll()
  nextTick(() => lbTrigger?.focus())          // 모달 닫히면 트리거 버튼으로 포커스 복귀
}

/** Tab / Shift+Tab 키를 모달 내 포커스 가능 요소 안에서만 순환 */
function trapFocus(e: KeyboardEvent): void {
  if (!lbRef.value) return
  const focusable = Array.from(
    lbRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(el => !el.hasAttribute('disabled'))
  if (!focusable.length) return
  const idx = focusable.indexOf(document.activeElement as HTMLElement)
  if (e.shiftKey) {
    const target = focusable[idx <= 0 ? focusable.length - 1 : idx - 1]
    target?.focus()
  } else {
    const target = focusable[idx >= focusable.length - 1 ? 0 : idx + 1]
    target?.focus()
  }
}

// ── 라이트박스 pinch-to-zoom ─────────────────────────────────

const lbScale  = ref(1)
const lbOriginX = ref(0)
const lbOriginY = ref(0)

const MIN_SCALE = 1
const MAX_SCALE = 4

const imgTransformStyle = computed(() => ({
  transform: `scale(${lbScale.value}) translate(${lbOriginX.value}px, ${lbOriginY.value}px)`,
  transformOrigin: 'center center',
  transition: 'none',
}))

// 두 터치 포인트 간 거리
function touchDist(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX
  const dy = a.clientY - b.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

let pinchStartDist = 0
let pinchStartScale = 1
let panStartX = 0
let panStartY = 0
let panStartOriginX = 0
let panStartOriginY = 0

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length === 2) {
    pinchStartDist = touchDist(e.touches[0], e.touches[1])
    pinchStartScale = lbScale.value
  } else if (e.touches.length === 1 && lbScale.value > 1) {
    panStartX = e.touches[0].clientX
    panStartY = e.touches[0].clientY
    panStartOriginX = lbOriginX.value
    panStartOriginY = lbOriginY.value
  }
}

function onTouchMove(e: TouchEvent): void {
  if (e.touches.length === 2) {
    const dist = touchDist(e.touches[0], e.touches[1])
    const ratio = dist / pinchStartDist
    lbScale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale * ratio))
  } else if (e.touches.length === 1 && lbScale.value > 1) {
    const dx = (e.touches[0].clientX - panStartX) / lbScale.value
    const dy = (e.touches[0].clientY - panStartY) / lbScale.value
    lbOriginX.value = panStartOriginX + dx
    lbOriginY.value = panStartOriginY + dy
  }
}

function onTouchEnd(e: TouchEvent): void {
  // 핀치 종료 후 scale < 1이면 리셋
  if (e.touches.length < 2 && lbScale.value < MIN_SCALE) {
    lbScale.value = MIN_SCALE
    lbOriginX.value = 0
    lbOriginY.value = 0
  }
  // 축소 시 pan 위치도 리셋
  if (lbScale.value === MIN_SCALE) {
    lbOriginX.value = 0
    lbOriginY.value = 0
  }
}
</script>

<style scoped lang="scss">
.att-swiper {
  position: relative;
  border-radius: var(--radius-sm);
  outline: none;
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 3px;
    border-radius: var(--radius-sm);
  }
}

// ── 트랙 ──────────────────────────────────────────────────────

.att-swiper__track {
  display: flex;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.att-swiper__slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  min-width: 0;
  position: relative;
}

// ── 이미지 슬라이드 ───────────────────────────────────────────

.att-swiper__img-wrap {
  height: 320px;         // 고정 높이 — 버튼 위치 일관성
  background: var(--color-bg);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;

  @media (max-width: 480px) {
    height: 260px;
  }
}

.att-swiper__img-btn {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  background: none;
  padding: var(--space-4) 0;
  cursor: zoom-in;

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }
}

.att-swiper__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
}

// img-wrap 바깥에 위치 — 고정 높이와 무관하게 항상 노출
.att-swiper__controls {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-1) 0;
  transition: opacity 0.2s ease;

  &--inactive {
    opacity: 0;
    pointer-events: none;
  }
}

// ── PDF 슬라이드 ──────────────────────────────────────────────

.att-swiper__pdf-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.att-swiper__pdf {
  width: 100%;
  height: 70vh;
  min-height: 480px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);

  @media (max-width: 480px) {
    height: 65vh;
    min-height: 400px;
  }
}

.att-swiper__pdf-link {
  font-size: 0.8125rem;
  color: var(--color-primary);
  align-self: flex-start;
  &:hover { text-decoration: underline; }
}

// ── 화살표 버튼 ───────────────────────────────────────────────

.att-swiper__arrow {
  position: absolute;
  top: 40%;
  transform: translateY(-50%);
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.38);
  color: #fff;
  cursor: pointer;
  transition: background var(--transition-fast), opacity var(--transition-fast);

  &:hover:not(:disabled) { background: rgba(0, 0, 0, 0.58); }
  &:disabled { opacity: 0.2; cursor: default; pointer-events: none; }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  &--prev { left: var(--space-2); }
  &--next { right: var(--space-2); }
}

// ── 페이지네이션 (숫자) ───────────────────────────────────────

.att-swiper__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: var(--space-3);
  min-height: 18px;
}

.att-swiper__count {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

// ── 라이트박스 ────────────────────────────────────────────────

.lb {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lb__close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 1;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast);

  &:hover { background: rgba(255, 255, 255, 0.28); }
  &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
}

.lb__img-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none; // 브라우저 기본 pinch-zoom 억제 → 직접 제어
}

.lb__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
  will-change: transform;
}
</style>
