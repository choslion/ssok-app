<template>
  <div v-if="chips.length" class="chip-row-outer">

    <!--
      chip-row-wrap : 마스크 담당 (overflow 없음 → outline clip 없음)
      chip-row-scroll: 스크롤 담당 (overflow-x: auto, mask 없음)
      → 두 역할 분리로 mask가 자식 focus outline을 clip하는 문제 해결
    -->
    <div
      class="chip-row-wrap"
      :class="{ 'chip-row-wrap--expanded': expanded }"
      role="group"
      :aria-label="groupLabel"
    >
      <div class="chip-row-scroll">
        <button
          v-for="chip in chips"
          :key="chip"
          type="button"
          class="chip"
          :class="{ 'chip--active': modelValue === chip }"
          :aria-pressed="modelValue === chip"
          @click="onChipClick(chip)"
        >{{ chip }}</button>
      </div>
    </div>

    <!-- 펼치기/접기 버튼: chip-row-wrap 바깥 → 마스크에 영향 없음 -->
    <button
      v-if="chips.length > threshold"
      type="button"
      class="chip-row__expand"
      :class="{ 'chip-row__expand--open': expanded }"
      :aria-label="expanded ? (collapseLabel ?? '접기') : (expandLabel ?? '더 보기')"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
        <path d="M1 1.5l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  chips: string[]
  modelValue?: string
  threshold?: number
  groupLabel?: string
  expandLabel?: string
  collapseLabel?: string
}>(), {
  modelValue: '',
  threshold: 4,
  groupLabel: '항목 선택',
  expandLabel: '더 보기',
  collapseLabel: '접기',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const expanded = ref(false)

function onChipClick(chip: string): void {
  emit('update:modelValue', props.modelValue === chip ? '' : chip)
}
</script>

<style scoped lang="scss">
// ── 외부 레이아웃 ──────────────────────────────────────────────────────────────

.chip-row-outer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

// ── 마스크 컨테이너 (overflow 없음 → outline 미clip) ───────────────────────────

.chip-row-wrap {
  flex: 1;
  min-width: 0;

  // 오른쪽 끝 페이드 — 스크롤 가능함을 암시
  mask-image: linear-gradient(to right, black calc(100% - 32px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 32px), transparent 100%);

  // 선택된 칩이 있거나 포커스 중: 마스크 제거
  &:has(.chip--active),
  &:has(:focus-visible) {
    mask-image: none;
    -webkit-mask-image: none;
  }

  // 펼침 상태: 마스크 제거
  &--expanded {
    mask-image: none;
    -webkit-mask-image: none;
  }
}

// ── 스크롤 컨테이너 (마스크 없음 → clip 문제 없음) ────────────────────────────

.chip-row-scroll {
  display: flex;
  gap: var(--space-2);
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 3px 0; // focus outline 상하 잘림 방지
  scroll-padding-right: 48px; // Tab 포커스 시 페이드 구간 밖에 위치
  &::-webkit-scrollbar { display: none; }

  .chip-row-wrap--expanded & {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}

// ── 칩 버튼 ───────────────────────────────────────────────────────────────────

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
  white-space: nowrap;
  transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);

  &--active {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(255, 107, 0, 0.06);
    font-weight: 600;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

// ── 펼치기/접기 버튼 ──────────────────────────────────────────────────────────

.chip-row__expand {
  flex-shrink: 0;
  align-self: flex-start;
  width: 30px;
  height: 30px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  svg { transition: transform var(--transition-fast); }
  &--open svg { transform: rotate(180deg); }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}
</style>
