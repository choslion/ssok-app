<template>
  <div class="spaces-page">

    <!-- 페이지 헤더 + 모드 토글 (우상단 inline) -->
    <div class="spaces-page__header">
      <div class="spaces-page__header-meta">
        <h1 class="spaces-page__title">보관함</h1>
        <p class="spaces-page__subtitle">
          {{ browseMode === 'space' ? '공간별로 물건을 찾아보세요.' : '제품별로 물건을 찾아보세요.' }}
        </p>
      </div>
      <div
        class="mode-toggle"
        :class="{ 'mode-toggle--topic': browseMode === 'topic' }"
        role="group"
        aria-label="보기 모드 선택"
      >
        <button
          type="button"
          class="mode-btn"
          :class="{ 'mode-btn--active': browseMode === 'space' }"
          :aria-pressed="browseMode === 'space'"
          @click="switchMode('space')"
        >공간</button>
        <button
          type="button"
          class="mode-btn"
          :class="{ 'mode-btn--active': browseMode === 'topic' }"
          :aria-pressed="browseMode === 'topic'"
          @click="switchMode('topic')"
        >제품</button>
      </div>
    </div>

    <!-- 종류 필터 -->
    <ChipRow
      v-model="typeChipModel"
      :chips="TYPE_CHIPS"
      class="type-filter-chips"
      group-label="종류 필터"
    />

    <!-- 로딩 -->
    <p v-if="loading" class="spaces-status" aria-live="polite">불러오는 중…</p>

    <template v-else>

      <!-- ── 공간 카드 그리드 ─────────────────────────────────────────── -->
      <template v-if="browseMode === 'space'">
        <ul v-if="allSpaces.length" ref="spaceListRef" class="space-list" aria-label="보관 장소 목록">
          <li v-for="sp in allSpaces" :key="sp.name" class="space-card-wrap">
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
            <!-- 3-dot 메뉴: 미분류 제외 -->
            <button
              v-if="!sp.unclassified"
              type="button"
              class="space-card__menu-btn"
              :aria-label="`${sp.name} 공간 이름 변경`"
              @click.stop="openRenameModal(sp.name, $event)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="3" r="1.25" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.25" fill="currentColor"/>
                <circle cx="8" cy="13" r="1.25" fill="currentColor"/>
              </svg>
            </button>
          </li>
        </ul>
        <p v-else class="spaces-status">이 공간에 등록된 물건이 없어요.</p>
      </template>

      <!-- ── 제품 카드 그리드 ───────────────────────────────────────── -->
      <template v-else>
        <ul v-if="allTopics.length" ref="topicListRef" class="space-list" aria-label="제품 목록">
          <li v-for="tp in allTopics" :key="tp.name" class="space-card-wrap">
            <button
              type="button"
              class="space-card"
              :class="{
                'space-card--unclassified': tp.unclassified,
                'space-card--selected': selectedTopic === tp.name,
              }"
              :aria-pressed="selectedTopic === tp.name"
              :aria-label="`${tp.name}, ${tp.count}개 항목`"
              @click="toggleTopic(tp.name)"
            >
              <div class="space-card__icon" aria-hidden="true">
                <svg v-if="!tp.unclassified" width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 7h11l4 5-4 5H3V7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                  <circle cx="7.5" cy="12" r="1" fill="currentColor"/>
                </svg>
                <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 2"/>
                  <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="space-card__body">
                <span class="space-card__name">{{ tp.name }}</span>
                <span class="space-card__count">{{ tp.count }}개</span>
              </div>
            </button>
            <!-- 3-dot 메뉴: 미분류 제외 -->
            <button
              v-if="!tp.unclassified"
              type="button"
              class="space-card__menu-btn"
              :aria-label="`${tp.name} 제품 이름 변경`"
              @click.stop="openRenameModal(tp.name, $event, 'topic')"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="3" r="1.25" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.25" fill="currentColor"/>
                <circle cx="8" cy="13" r="1.25" fill="currentColor"/>
              </svg>
            </button>
          </li>
        </ul>
        <p v-else class="spaces-status">등록된 제품이 없어요. 항목 추가 시 제품을 입력해 보세요.</p>
      </template>

    </template>

    <!-- ── 바텀 시트 ──────────────────────────────────────────────────── -->
    <SpaceSheet
      :open="sheetOpen"
      :space-name="selectedName"
      :items="filteredItems"
      @close="closeSheet"
    />

    <!-- ── 공간 이름 변경 모달 ──────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="rename-fade">
        <div
          v-if="renameModalOpen"
          class="rename-overlay"
          aria-hidden="true"
          @click="closeRenameModal"
        />
      </Transition>
      <Transition name="rename-slide">
        <div
          v-if="renameModalOpen"
          ref="renameModalEl"
          class="rename-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-modal-title"
          @keydown="onRenameKeydown"
        >
          <h2 id="rename-modal-title" class="rename-modal__title">{{ renameMode === 'topic' ? '제품 이름 변경' : '공간 이름 변경' }}</h2>
          <div class="rename-modal__field">
            <label for="rename-input" class="rename-modal__label">새 이름</label>
            <input
              id="rename-input"
              ref="renameInputEl"
              v-model="renameValue"
              type="text"
              class="rename-modal__input"
              :class="{ 'rename-modal__input--error': renameError }"
              :maxlength="RENAME_MAX"
              autocomplete="off"
              aria-required="true"
              :aria-invalid="!!renameError"
              :aria-describedby="renameError ? 'rename-error' : (renameDisplayCount >= RENAME_MAX ? 'rename-len-hint' : undefined)"
              @input="onRenameInput"
              @keydown.enter.prevent="submitRename"
            />
            <div class="rename-modal__field-footer">
              <p
                v-if="renameDisplayCount >= RENAME_MAX"
                id="rename-len-hint"
                class="rename-modal__hint"
                aria-live="polite"
              >최대 {{ RENAME_MAX }}자까지 입력 가능합니다.</p>
              <span v-else aria-hidden="true"></span>
              <span
                class="rename-modal__counter"
                :class="{ 'rename-modal__counter--full': renameDisplayCount >= RENAME_MAX }"
                aria-hidden="true"
              >{{ renameDisplayCount }}/{{ RENAME_MAX }}</span>
            </div>
            <p
              v-if="renameError"
              id="rename-error"
              class="rename-modal__error"
              role="alert"
            >{{ renameError }}</p>
          </div>
          <div class="rename-modal__actions">
            <button type="button" class="rename-btn rename-btn--cancel" @click="closeRenameModal">취소</button>
            <button type="button" class="rename-btn rename-btn--confirm" @click="submitRename">변경하기</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
useHead({ title: '보관함 · SSOK' })
import type { Item, ItemDocType } from '~~/shared/types/ssok'
import { TYPE_LABELS } from '~~/shared/utils/format'

// ── 상수 ──────────────────────────────────────────────────────────────────────

const ALL_TYPES: ItemDocType[] = ['receipt', 'warranty', 'manual']

// ChipRow 용 타입 필터 매핑
const TYPE_REVERSE = Object.fromEntries(
  Object.entries(TYPE_LABELS).map(([k, v]) => [v, k]),
) as Record<string, ItemDocType>
const TYPE_CHIPS = ['전체', ...ALL_TYPES.map(t => TYPE_LABELS[t])]

// ── 데이터 로딩 (메타데이터만 — 블롭 미로딩) ─────────────────────────────────

const { items, loadItems, renameSpace, renameTopic } = useItems()
const { renameCustomSpace, effectiveDefaultSpaces } = useCustomSpaces()
const loading = ref(true)
const route = useRoute()
const router = useRouter()

const spaceListRef = ref<HTMLElement | null>(null)
const topicListRef = ref<HTMLElement | null>(null)
const { runEntrance: runSpaceEntrance } = useCardEntrance(spaceListRef, ':scope > li')
const { runEntrance: runTopicEntrance } = useCardEntrance(topicListRef, ':scope > li')

onMounted(async () => {
  await loadItems()
  loading.value = false

  // 폴더 카드 stagger 진입 애니메이션
  if (browseMode.value === 'space') await runSpaceEntrance()
  else await runTopicEntrance()

  // 아이템 상세에서 돌아온 경우 — 이전 필터/드로어 복원
  const typeQuery = route.query.type as string | undefined
  if (typeQuery && (['receipt', 'warranty', 'manual'] as string[]).includes(typeQuery)) {
    activeType.value = typeQuery as ItemDocType
  }

  const topicQuery = route.query.topic as string | undefined
  const spaceQuery = route.query.space as string | undefined
  if (topicQuery) {
    browseMode.value = 'topic'
    toggleTopic(topicQuery)
  } else if (spaceQuery) {
    toggleSpace(spaceQuery)
  }
})

// ── 보기 모드 ─────────────────────────────────────────────────────────────────

const browseMode = useState<'space' | 'topic'>('spaces-browseMode', () => 'space')

function switchMode(mode: 'space' | 'topic'): void {
  if (browseMode.value === mode) return
  sheetOpen.value = false
  selectedSpace.value = null
  selectedTopic.value = null
  browseMode.value = mode
  const query: Record<string, string> = {}
  if (activeType.value) query.type = activeType.value
  router.replace({ path: '/spaces', query })
}

// ── 종류 필터 ──────────────────────────────────────────────────────────────────

const activeType = useState<ItemDocType | null>('spaces-activeType', () => null)

function setActiveType(type: ItemDocType | null): void {
  activeType.value = type
  const query: Record<string, string> = {}
  if (type) query.type = type

  if (browseMode.value === 'space' && selectedSpace.value) query.space = selectedSpace.value
  if (browseMode.value === 'topic' && selectedTopic.value) query.topic = selectedTopic.value
  router.replace({ path: '/spaces', query })
}

const typeChipModel = computed({
  get: () => activeType.value ? TYPE_LABELS[activeType.value] : '전체',
  set: (label: string) => setActiveType(TYPE_REVERSE[label] ?? null),
})

// ── 공간 선택 / 시트 상태 ─────────────────────────────────────────────────────

const selectedSpace = useState<string | null>('spaces-selectedSpace', () => null)
const selectedTopic = useState<string | null>('spaces-selectedTopic', () => null)
const sheetOpen = useState<boolean>('spaces-sheetOpen', () => false)

const selectedName = computed(() =>
  browseMode.value === 'space' ? (selectedSpace.value ?? '') : (selectedTopic.value ?? '')
)

function toggleSpace(name: string): void {
  selectedSpace.value = name
  sheetOpen.value = true
  const query: Record<string, string> = { space: name }
  if (activeType.value) query.type = activeType.value
  router.replace({ path: '/spaces', query })
}

function toggleTopic(name: string): void {
  selectedTopic.value = name
  sheetOpen.value = true
  const query: Record<string, string> = { topic: name }
  if (activeType.value) query.type = activeType.value
  router.replace({ path: '/spaces', query })
}

function closeSheet(): void {
  sheetOpen.value = false
  selectedSpace.value = null
  selectedTopic.value = null
  const query: Record<string, string> = {}
  if (activeType.value) query.type = activeType.value
  router.replace({ path: '/spaces', query })
}

// ── 공간/제품 이름 변경 ────────────────────────────────────────────────────────

const renameModalOpen   = ref(false)
const renameTargetSpace = ref('')
const renameValue       = ref('')
const renameError       = ref('')
const renameMode        = ref<'space' | 'topic'>('space')
const renameInputEl     = ref<HTMLInputElement | null>(null)
const renameModalEl     = ref<HTMLElement | null>(null)
const renameTriggerEl    = ref<HTMLElement | null>(null)
const renameDisplayCount = ref(0)

const RENAME_MAX = 20

function onRenameInput(e: Event): void {
  renameDisplayCount.value = (e.target as HTMLInputElement).value.length
}

function openRenameModal(name: string, e: Event, mode: 'space' | 'topic' = 'space'): void {
  renameTargetSpace.value = name
  renameValue.value = name
  renameDisplayCount.value = name.length
  renameError.value = ''
  renameMode.value = mode
  renameTriggerEl.value = e.currentTarget as HTMLElement
  renameModalOpen.value = true
}

function closeRenameModal(): void {
  renameModalOpen.value = false
  renameError.value = ''
  nextTick(() => renameTriggerEl.value?.focus())
}

function onRenameKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') { closeRenameModal(); return }
  if (e.key !== 'Tab' || !renameModalEl.value) return
  const focusables = Array.from(
    renameModalEl.value.querySelectorAll<HTMLElement>('input, button'),
  )
  if (!focusables.length) return
  const first = focusables.at(0)
  const last  = focusables.at(-1)
  if (!first || !last) return
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus() }
  }
}

watch(renameModalOpen, async (open) => {
  if (open) {
    await nextTick()
    renameInputEl.value?.select()
  }
})

async function submitRename(): Promise<void> {
  const newName = renameValue.value.trim()

  if (!newName) {
    renameError.value = '이름을 입력해 주세요.'
    renameInputEl.value?.focus()
    return
  }
  if (newName === renameTargetSpace.value) { closeRenameModal(); return }

  const oldName = renameTargetSpace.value

  if (renameMode.value === 'topic') {
    const duplicate = allTopics.value.some(
      t => !t.unclassified
        && t.name !== oldName
        && t.name.trim().toLowerCase() === newName.toLowerCase(),
    )
    if (duplicate) {
      renameError.value = '이미 존재하는 이름입니다.'
      renameInputEl.value?.focus()
      return
    }
    await renameTopic(oldName, newName)
    renameCustomTopic(oldName, newName)

    // selectedTopic 상태 및 route query 동기화
    if (selectedTopic.value === oldName) {
      selectedTopic.value = newName
      const query: Record<string, string> = { topic: newName }
      if (activeType.value) query.type = activeType.value
      router.replace({ path: '/spaces', query })
    }
  } else {
    const duplicate = allSpaces.value.some(
      s => !s.unclassified
        && s.name !== oldName
        && s.name.trim().toLowerCase() === newName.toLowerCase(),
    )
    if (duplicate) {
      renameError.value = '이미 존재하는 이름입니다.'
      renameInputEl.value?.focus()
      return
    }
    await renameSpace(oldName, newName)
    renameCustomSpace(oldName, newName)

    // selectedSpace 상태 및 route query 동기화
    if (selectedSpace.value === oldName) {
      selectedSpace.value = newName
      const query: Record<string, string> = { space: newName }
      if (activeType.value) query.type = activeType.value
      router.replace({ path: '/spaces', query })
    }
  }

  closeRenameModal()
}

// ── 공간 목록 + 카운트 ────────────────────────────────────────────────────────

interface SpaceEntry {
  name: string
  count: number
  unclassified: boolean
}

const allSpaces = computed<SpaceEntry[]>(() => {
  // 이름 변경이 반영된 기본 공간 목록 사용 (예: ['안방', '주방'])
  const effectiveDefaults = effectiveDefaultSpaces.value
  const effectiveDefaultSet = new Set<string>(effectiveDefaults)

  function countFor(filterFn: (i: Item) => boolean): number {
    return items.value.filter(i => {
      if (activeType.value && i.type !== activeType.value) return false
      return filterFn(i)
    }).length
  }

  const result: SpaceEntry[] = effectiveDefaults.map(name => ({
    name,
    count: countFor(i => i.space === name),
    unclassified: false,
  }))

  const customSeen = new Set<string>()
  for (const item of items.value) {
    if (item.space && !effectiveDefaultSet.has(item.space) && !customSeen.has(item.space)) {
      customSeen.add(item.space)
      result.push({
        name: item.space,
        count: countFor(i => i.space === item.space),
        unclassified: false,
      })
    }
  }

  const unclassifiedCount = countFor(i => !i.space)
  if (unclassifiedCount > 0) {
    result.push({ name: '미분류', count: unclassifiedCount, unclassified: true })
  }

  // 아이템이 없는 공간 카드는 숨김
  return result.filter(entry => entry.count > 0)
})

// ── 제품 목록 + 카운트 ──────────────────────────────────────────────────────
// getTopics()로 정렬/중복 제거된 이름 목록을 받아 카운트만 계산

const { getTopics } = useItems()
const { customTopics, renameCustomTopic, effectiveDefaultTopics } = useCustomTopics()

const allTopics = computed<SpaceEntry[]>(() => {
  function countFor(filterFn: (i: Item) => boolean): number {
    return items.value.filter(i => {
      if (activeType.value && i.type !== activeType.value) return false
      return filterFn(i)
    }).length
  }

  // 이름 변경이 반영된 기본 제품 (항상 표시)
  const effectiveDefaults = effectiveDefaultTopics.value
  const seen = new Set<string>(effectiveDefaults)
  const result: SpaceEntry[] = effectiveDefaults.map(name => ({
    name,
    count: countFor(i => i.topic === name),
    unclassified: false,
  }))

  // 사용자 정의 제품 (localStorage) — /add에서 추가한 항목도 바로 표시
  for (const name of customTopics.value) {
    if (!seen.has(name)) {
      seen.add(name)
      result.push({ name, count: countFor(i => i.topic === name), unclassified: false })
    }
  }

  // 항목에 직접 입력된 제품 (IndexedDB) — 위에서 다루지 않은 것만 추가
  for (const name of getTopics()) {
    if (!seen.has(name)) {
      seen.add(name)
      result.push({ name, count: countFor(i => i.topic === name), unclassified: false })
    }
  }

  const unclassifiedCount = countFor(i => !i.topic)
  if (unclassifiedCount > 0) {
    result.push({ name: '미분류', count: unclassifiedCount, unclassified: true })
  }

  // 아이템이 없는 제품 카드는 숨김
  return result.filter(entry => entry.count > 0)
})

// ── 필터된 항목 ───────────────────────────────────────────────────────────────

const filteredItems = computed<Item[]>(() => {
  if (browseMode.value === 'space') {
    if (selectedSpace.value === null) return []
    let result = selectedSpace.value === '미분류'
      ? items.value.filter(i => !i.space)
      : items.value.filter(i => i.space === selectedSpace.value)
    if (activeType.value) result = result.filter(i => i.type === activeType.value)
    return result
  } else {
    if (selectedTopic.value === null) return []
    let result = selectedTopic.value === '미분류'
      ? items.value.filter(i => !i.topic)
      : items.value.filter(i => i.topic === selectedTopic.value)
    if (activeType.value) result = result.filter(i => i.type === activeType.value)
    return result
  }
})

</script>

<style scoped lang="scss">
.spaces-page {
  // iOS 홈 인디케이터 영역 + 고정 하단 내비게이션 겹침 방지
  padding-bottom: calc(var(--space-7) + env(safe-area-inset-bottom, 0px));

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  &__header-meta {
    flex: 1;
    min-width: 0;
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

// ── 모드 토글 ──────────────────────────────────────────────────────────────────

.mode-toggle {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr; // 텍스트 길이 무관 정확한 50/50
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: var(--space-1);
  padding: 3px;
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07), inset 0 1px 2px rgba(0, 0, 0, 0.04);

  // 슬라이딩 pill — 활성 버튼 아래에서 좌우로 이동
  &::before {
    content: '';
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 3px;
    width: calc(50% - 3px);
    background: var(--color-surface);
    border-radius: var(--radius-full);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    transition: transform var(--transition-base);
    pointer-events: none;
  }

  // 제품 모드: pill을 오른쪽으로 이동 (translateX(100%) = pill 자신의 너비만큼)
  &--topic::before {
    transform: translateX(100%);
  }
}

.mode-btn {
  position: relative; // pill 위에 렌더링
  z-index: 1;
  flex: 1; // 50/50 등분
  padding: 5px var(--space-3);
  font-size: 0.8125rem;
  font-family: inherit;
  font-weight: 500;
  color: var(--color-sub);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  text-align: center;
  border-radius: var(--radius-full);
  transition: color var(--transition-fast);

  &--active {
    color: var(--color-primary);
    font-weight: 600;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }
}

.spaces-status {
  font-size: 0.9375rem;
  color: var(--color-sub);
  text-align: center;
  padding: var(--space-8) var(--space-4);
  margin: 0;
}

// ── 종류 필터 칩 ──────────────────────────────────────────────────────────────

.type-filter-chips {
  margin-bottom: var(--space-4);
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
  &__body { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
  &__name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    min-height: 2.8em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }
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

// ── 공간 카드 래퍼 (3-dot 버튼을 절대 위치로 담기 위한 컨테이너) ─────────────

.space-card-wrap {
  position: relative;

  // 호버 시 3-dot 버튼 표시
  // &:hover .space-card__menu-btn,
  // .space-card__menu-btn:focus-visible {
  //   opacity: 1;
  // }
}

// ── 3-dot 메뉴 버튼 ───────────────────────────────────────────────────────────

.space-card__menu-btn {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  color: var(--color-sub);
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  opacity: 1;
  transition: opacity var(--transition-fast), background var(--transition-fast), color var(--transition-fast);

  &:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  // 터치 기기: 항상 표시
  @media (hover: none) {
    opacity: 1;
  }
}

// ── 이름 변경 모달 ────────────────────────────────────────────────────────────

.rename-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 300;
}

.rename-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 301;
  width: min(400px, calc(100vw - var(--space-6)));
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.20);

  &__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 var(--space-4);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-5);
  }

  &__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__input {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    font-size: 1rem;
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-sm);
    transition: border-color var(--transition-fast);
    appearance: none;

    &:focus-visible {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.18);
    }

    &--error { border-color: #E03131; }
  }

  &__field-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 1rem;
    margin-top: calc(-1 * var(--space-1));
  }

  &__counter {
    flex-shrink: 0;
    font-size: 0.6875rem;
    color: var(--color-sub);
    line-height: 1;

    &--full { color: #E03131; font-weight: 600; }
  }

  &__hint {
    font-size: 0.75rem;
    color: #E03131;
    margin: 0;
    flex: 1;
  }

  &__error {
    font-size: 0.8125rem;
    color: #E03131;
    margin: var(--space-1) 0 0;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
}

.rename-btn {
  padding: var(--space-2) var(--space-4);
  font-size: 0.9375rem;
  font-family: inherit;
  font-weight: 600;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity var(--transition-fast), background var(--transition-fast);

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &--cancel {
    color: var(--color-sub);
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    &:hover { border-color: var(--color-primary); color: var(--color-primary); }
  }

  &--confirm {
    color: var(--color-btn-text);
    background: var(--color-primary);
    border: none;
    &:hover { opacity: 0.88; }
  }
}

// ── 모달 전환 애니메이션 ──────────────────────────────────────────────────────

.rename-fade-enter-active,
.rename-fade-leave-active { transition: opacity 0.18s ease; }
.rename-fade-enter-from,
.rename-fade-leave-to     { opacity: 0; }

.rename-slide-enter-active,
.rename-slide-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.rename-slide-enter-from,
.rename-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-50% + 10px));
}
</style>
