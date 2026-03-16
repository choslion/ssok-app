// 사용자 정의 공간 목록을 IndexedDB(settings 스토어)에 저장/복원
// 기본 공간과 중복되지 않도록 필터링

const IDB_KEY_SPACES   = 'custom-spaces'
const IDB_KEY_RENAMED  = 'renamed-default-spaces'
// 구 localStorage 키 (일회성 마이그레이션용)
const LS_KEY_SPACES    = 'ssok-custom-spaces'
const LS_KEY_RENAMED   = 'ssok-renamed-default-spaces'

export const DEFAULT_SPACES = ['거실', '주방'] as const
const DEFAULT_SET = new Set<string>(DEFAULT_SPACES)

const customSpaces    = useState<string[]>('customSpaces',         () => [])
const renamedDefaults = useState<Record<string, string>>('renamedDefaultSpaces', () => ({}))

// 이름 변경이 반영된 기본 공간 목록
const effectiveDefaultSpaces = computed<string[]>(() =>
  (DEFAULT_SPACES as readonly string[]).map(name => renamedDefaults.value[name] ?? name),
)

// 기본 + 사용자 정의 공간 (칩 렌더링용)
const allSpaceChips = computed<string[]>(() => [
  ...effectiveDefaultSpaces.value,
  ...customSpaces.value,
])

// ── IndexedDB 읽기/쓰기 헬퍼 ─────────────────────────────────────────────────

async function saveSpacesToDb(): Promise<void> {
  const db = await useDb()
  await db.put('settings', { key: IDB_KEY_SPACES,  value: customSpaces.value })
  await db.put('settings', { key: IDB_KEY_RENAMED, value: renamedDefaults.value })
}

// ── 초기화 (IDB 로드 + localStorage 일회성 마이그레이션) ────────────────────

let _loadPromise: Promise<void> | null = null

async function loadCustomSpaces(): Promise<void> {
  const db = await useDb()

  const spacesEntry  = await db.get('settings', IDB_KEY_SPACES)
  const renamedEntry = await db.get('settings', IDB_KEY_RENAMED)

  if (spacesEntry !== undefined || renamedEntry !== undefined) {
    // IDB에 데이터가 있으면 그대로 사용
    if (spacesEntry)  customSpaces.value    = spacesEntry.value as string[]
    if (renamedEntry) renamedDefaults.value = renamedEntry.value as Record<string, string>
    return
  }

  // IDB에 없으면 localStorage에서 일회성 마이그레이션
  try {
    const rawSpaces = localStorage.getItem(LS_KEY_SPACES)
    if (rawSpaces) {
      const parsed = JSON.parse(rawSpaces) as unknown
      if (Array.isArray(parsed)) {
        customSpaces.value = (parsed as unknown[])
          .filter((s): s is string => typeof s === 'string' && !DEFAULT_SET.has(s))
      }
      localStorage.removeItem(LS_KEY_SPACES)
    }
  } catch { /* ignore */ }

  try {
    const rawRenamed = localStorage.getItem(LS_KEY_RENAMED)
    if (rawRenamed) {
      const parsed = JSON.parse(rawRenamed) as unknown
      if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
        renamedDefaults.value = parsed as Record<string, string>
      }
      localStorage.removeItem(LS_KEY_RENAMED)
    }
  } catch { /* ignore */ }

  await saveSpacesToDb()
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

export const useCustomSpaces = () => {
  // 첫 호출 시 자동 로드 (이후 호출은 캐시된 프로미스 반환)
  if (import.meta.client) {
    if (!_loadPromise) _loadPromise = loadCustomSpaces().catch(console.error) as Promise<void>
  }

  // 사용자 정의 공간 추가 (기본 공간 · 중복 무시)
  const addCustomSpace = (space: string): void => {
    const trimmed = space.trim()
    if (!trimmed || DEFAULT_SET.has(trimmed) || customSpaces.value.includes(trimmed)) return
    customSpaces.value = [...customSpaces.value, trimmed]
    saveSpacesToDb().catch(console.error)
  }

  // 공간 이름 변경 — 기본 공간·커스텀 공간 모두 처리
  const renameCustomSpace = (oldName: string, newName: string): void => {
    const originalDefault = (DEFAULT_SPACES as readonly string[]).find(
      d => (renamedDefaults.value[d] ?? d) === oldName,
    )
    if (originalDefault) {
      renamedDefaults.value = { ...renamedDefaults.value, [originalDefault]: newName }
    } else {
      const idx = customSpaces.value.indexOf(oldName)
      if (idx === -1) return
      const updated = [...customSpaces.value]
      updated[idx] = newName
      customSpaces.value = updated
    }
    saveSpacesToDb().catch(console.error)
  }

  return { customSpaces, addCustomSpace, renameCustomSpace, allSpaceChips, effectiveDefaultSpaces }
}
