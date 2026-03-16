// 사용자 정의 제품 목록을 IndexedDB(settings 스토어)에 저장/복원
// 기본 제품과 중복되지 않도록 필터링

const IDB_KEY_TOPICS   = 'custom-topics'
const IDB_KEY_RENAMED  = 'renamed-default-topics'
// 구 localStorage 키 (일회성 마이그레이션용)
const LS_KEY_TOPICS    = 'ssok-custom-topics'
const LS_KEY_RENAMED   = 'ssok-renamed-default-topics'

export const DEFAULT_TOPICS = ['TV', '냉장고'] as const
const DEFAULT_SET = new Set<string>(DEFAULT_TOPICS)

const customTopics          = useState<string[]>('customTopics',          () => [])
const renamedDefaultTopics  = useState<Record<string, string>>('renamedDefaultTopics', () => ({}))

// 이름 변경이 반영된 기본 제품 목록
const effectiveDefaultTopics = computed<string[]>(() =>
  (DEFAULT_TOPICS as readonly string[]).map(name => renamedDefaultTopics.value[name] ?? name),
)

// 기본 + 사용자 정의 제품 (칩 렌더링용)
const allTopicChips = computed<string[]>(() => [
  ...effectiveDefaultTopics.value,
  ...customTopics.value,
])

// ── IndexedDB 읽기/쓰기 헬퍼 ─────────────────────────────────────────────────

async function saveTopicsToDb(): Promise<void> {
  const db = await useDb()
  await db.put('settings', { key: IDB_KEY_TOPICS,  value: customTopics.value })
  await db.put('settings', { key: IDB_KEY_RENAMED, value: renamedDefaultTopics.value })
}

// ── 초기화 (IDB 로드 + localStorage 일회성 마이그레이션) ────────────────────

let _loadPromise: Promise<void> | null = null

async function loadCustomTopics(): Promise<void> {
  const db = await useDb()

  const topicsEntry  = await db.get('settings', IDB_KEY_TOPICS)
  const renamedEntry = await db.get('settings', IDB_KEY_RENAMED)

  if (topicsEntry !== undefined || renamedEntry !== undefined) {
    if (topicsEntry)  customTopics.value         = topicsEntry.value as string[]
    if (renamedEntry) renamedDefaultTopics.value = renamedEntry.value as Record<string, string>
    return
  }

  // IDB에 없으면 localStorage에서 일회성 마이그레이션
  try {
    const rawTopics = localStorage.getItem(LS_KEY_TOPICS)
    if (rawTopics) {
      const parsed = JSON.parse(rawTopics) as unknown
      if (Array.isArray(parsed)) {
        customTopics.value = (parsed as unknown[])
          .filter((s): s is string => typeof s === 'string' && !DEFAULT_SET.has(s))
      }
      localStorage.removeItem(LS_KEY_TOPICS)
    }
  } catch { /* ignore */ }

  try {
    const rawRenamed = localStorage.getItem(LS_KEY_RENAMED)
    if (rawRenamed) {
      const parsed = JSON.parse(rawRenamed) as unknown
      if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
        renamedDefaultTopics.value = parsed as Record<string, string>
      }
      localStorage.removeItem(LS_KEY_RENAMED)
    }
  } catch { /* ignore */ }

  await saveTopicsToDb()
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

export const useCustomTopics = () => {
  // 첫 호출 시 자동 로드
  if (import.meta.client) {
    if (!_loadPromise) _loadPromise = loadCustomTopics().catch(console.error) as Promise<void>
  }

  // 사용자 정의 제품 추가 (기본 제품 · 중복 무시)
  const addCustomTopic = (topic: string): void => {
    const trimmed = topic.trim()
    if (!trimmed || DEFAULT_SET.has(trimmed)) return
    const lower = trimmed.toLowerCase()
    if (customTopics.value.some(t => t.toLowerCase() === lower)) return
    customTopics.value = [...customTopics.value, trimmed]
    saveTopicsToDb().catch(console.error)
  }

  // 제품 이름 변경 — 기본 제품·커스텀 제품 모두 처리
  const renameCustomTopic = (oldName: string, newName: string): void => {
    const originalDefault = (DEFAULT_TOPICS as readonly string[]).find(
      d => (renamedDefaultTopics.value[d] ?? d) === oldName,
    )
    if (originalDefault) {
      renamedDefaultTopics.value = { ...renamedDefaultTopics.value, [originalDefault]: newName }
    } else {
      const idx = customTopics.value.indexOf(oldName)
      if (idx === -1) return
      const updated = [...customTopics.value]
      updated[idx] = newName
      customTopics.value = updated
    }
    saveTopicsToDb().catch(console.error)
  }

  return { customTopics, addCustomTopic, renameCustomTopic, allTopicChips, effectiveDefaultTopics }
}
