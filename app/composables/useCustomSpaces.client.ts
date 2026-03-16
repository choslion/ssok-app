// 사용자 정의 공간 목록을 localStorage에 저장/복원
// 기본 공간과 중복되지 않도록 필터링

const STORAGE_KEY = 'ssok-custom-spaces'
const RENAMED_DEFAULTS_KEY = 'ssok-renamed-default-spaces'

export const DEFAULT_SPACES = ['거실', '주방'] as const
const DEFAULT_SET = new Set<string>(DEFAULT_SPACES)

export const useCustomSpaces = () => {
  // useState로 SSR-safe 전역 상태 (클라이언트에서만 localStorage 읽기)
  const customSpaces = useState<string[]>('customSpaces', () => {
    if (!import.meta.client) return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as unknown) : []
      if (!Array.isArray(parsed)) return []
      // 기본 공간과 중복 제거, 문자열만 허용
      return (parsed as unknown[])
        .filter((s): s is string => typeof s === 'string' && !DEFAULT_SET.has(s))
    } catch {
      return []
    }
  })

  // 기본 공간 이름 변경 맵: { 원래이름 → 새이름 }  (예: { '거실': '안방' })
  const renamedDefaults = useState<Record<string, string>>('renamedDefaultSpaces', () => {
    if (!import.meta.client) return {}
    try {
      const raw = localStorage.getItem(RENAMED_DEFAULTS_KEY)
      const parsed = raw ? (JSON.parse(raw) as unknown) : {}
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) return {}
      return parsed as Record<string, string>
    } catch {
      return {}
    }
  })

  // 이름 변경이 반영된 기본 공간 목록 (예: ['안방', '주방'])
  const effectiveDefaultSpaces = computed<string[]>(() =>
    (DEFAULT_SPACES as readonly string[]).map(name => renamedDefaults.value[name] ?? name),
  )

  // 사용자 정의 공간 추가 (기본 공간 · 중복 무시)
  const addCustomSpace = (space: string): void => {
    const trimmed = space.trim()
    if (!trimmed || DEFAULT_SET.has(trimmed) || customSpaces.value.includes(trimmed)) return
    customSpaces.value = [...customSpaces.value, trimmed]
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customSpaces.value))
    }
  }

  // 기본 공간 + 사용자 정의 공간 합쳐서 반환 (이름 변경 반영, 칩 렌더링용)
  const allSpaceChips = computed<string[]>(() => [
    ...effectiveDefaultSpaces.value,
    ...customSpaces.value,
  ])

  // 공간 이름 변경 — 기본 공간·커스텀 공간 모두 처리
  const renameCustomSpace = (oldName: string, newName: string): void => {
    // 기본 공간 이름 변경: 원래 이름 또는 현재 유효 이름으로 탐색
    const originalDefault = (DEFAULT_SPACES as readonly string[]).find(
      d => (renamedDefaults.value[d] ?? d) === oldName,
    )
    if (originalDefault) {
      renamedDefaults.value = { ...renamedDefaults.value, [originalDefault]: newName }
      if (import.meta.client) {
        localStorage.setItem(RENAMED_DEFAULTS_KEY, JSON.stringify(renamedDefaults.value))
      }
      return
    }
    // 커스텀 공간 이름 변경
    const idx = customSpaces.value.indexOf(oldName)
    if (idx === -1) return
    const updated = [...customSpaces.value]
    updated[idx] = newName
    customSpaces.value = updated
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customSpaces.value))
    }
  }

  return { customSpaces, addCustomSpace, renameCustomSpace, allSpaceChips, effectiveDefaultSpaces }
}
