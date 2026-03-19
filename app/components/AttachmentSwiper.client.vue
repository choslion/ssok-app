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
      >
        <!-- 이미지 -->
        <div v-if="slide.kind === 'image'" class="att-swiper__img-wrap">
          <img
            :src="slide.url"
            :alt="slide.label"
            class="att-swiper__img"
            draggable="false"
          />
          <!-- 회전/크롭 등 컨트롤 (부모에서 슬롯으로 주입) -->
          <div class="att-swiper__controls">
            <slot name="controls" :slide="slide" :index="i" :active="i === current" />
          </div>
        </div>

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
      >‹</button>
      <button
        class="att-swiper__arrow att-swiper__arrow--next"
        :disabled="current === slides.length - 1"
        aria-label="다음 파일"
        @click="next"
      >›</button>
    </template>

    <!-- ── 페이지네이션 ───────────────────────────────────── -->
    <div
      v-if="slides.length > 1"
      class="att-swiper__pagination"
    >
      <!-- ≤10장: 점 표시 -->
      <template v-if="slides.length <= MAX_DOTS">
        <button
          v-for="(s, i) in slides"
          :key="s.id"
          class="att-swiper__dot"
          :class="{ 'att-swiper__dot--active': i === current }"
          :aria-label="`${i + 1}번째로 이동`"
          :aria-current="i === current ? 'true' : undefined"
          tabindex="-1"
          @click="goTo(i)"
        />
      </template>
      <!-- >10장: 숫자 텍스트 -->
      <span
        v-else
        class="att-swiper__count"
        aria-live="polite"
        aria-atomic="true"
      >{{ current + 1 }} / {{ slides.length }}</span>
    </div>
  </div>
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

const MAX_DOTS = 10

const current = computed(() => props.modelValue)
const trackRef = ref<HTMLDivElement | null>(null)

// ── 이동 ─────────────────────────────────────────────────────

/** 특정 인덱스로 이동 (smooth 또는 instant) */
function goTo(index: number, instant = false): void {
  if (!trackRef.value) return
  const track = trackRef.value
  const targetLeft = index * track.clientWidth
  if (instant) {
    track.scrollLeft = targetLeft
  } else {
    track.scrollTo({ left: targetLeft, behavior: 'smooth' })
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

let scrollTimer: ReturnType<typeof setTimeout> | null = null

function onScroll(): void {
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    if (!trackRef.value) return
    const { scrollLeft, clientWidth } = trackRef.value
    if (!clientWidth) return
    const newIndex = Math.round(scrollLeft / clientWidth)
    const clamped = Math.max(0, Math.min(props.slides.length - 1, newIndex))
    if (clamped !== current.value) {
      emit('update:modelValue', clamped)
    }
  }, 80)
}

// ── 외부 v-model 변경 시 스크롤 위치 동기화 ─────────────────

watch(
  () => props.modelValue,
  (newVal) => {
    if (!trackRef.value) return
    const { scrollLeft, clientWidth } = trackRef.value
    if (!clientWidth) return
    const visibleIndex = Math.round(scrollLeft / clientWidth)
    if (visibleIndex !== newVal) {
      goTo(newVal, true)
    }
  },
)

// ── 마운트 시 초기 위치 설정 ─────────────────────────────────

onMounted(() => {
  nextTick(() => {
    if (trackRef.value && props.modelValue > 0) {
      trackRef.value.scrollLeft = props.modelValue * trackRef.value.clientWidth
    }
  })
})

onUnmounted(() => {
  if (scrollTimer) clearTimeout(scrollTimer)
})
</script>

<style scoped lang="scss">
.att-swiper {
  position: relative;
  border-radius: var(--radius-sm);
  // 포커스 스타일 (키보드 내비게이션 표시)
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
  -webkit-overflow-scrolling: touch; // iOS 모멘텀 스크롤
  scrollbar-width: none;             // Firefox
  &::-webkit-scrollbar { display: none; } // Chrome/Safari
}

.att-swiper__slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  min-width: 0;
  position: relative;
}

// ── 이미지 슬라이드 ───────────────────────────────────────────

.att-swiper__img-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) 0;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.att-swiper__img {
  max-width: 100%;
  max-height: 480px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none; // 스와이프 충돌 방지
}

.att-swiper__controls {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-1);
  width: 100%;
  padding: 0 var(--space-1);
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
  top: 40%; // 이미지 중앙보다 약간 위
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
  font-size: 1.375rem;
  line-height: 1;
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

// ── 페이지네이션 ──────────────────────────────────────────────

.att-swiper__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: var(--space-3);
  min-height: 18px;
}

.att-swiper__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: var(--color-border);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast), width var(--transition-fast);

  &--active {
    background: var(--color-primary);
    transform: scale(1.4);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 3px;
  }
}

.att-swiper__count {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}
</style>
