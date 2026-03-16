// 사용자 정의 공간 목록을 localStorage에 저장/복원
// 기본 공간과 중복되지 않도록 필터링

const STORAGE_KEY = 'ssok-custom-spaces'

const DEFAULT_SPACES = ['거실', '주방'] as const
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

  // 사용자 정의 공간 추가 (기본 공간 · 중복 무시)
  const addCustomSpace = (space: string): void => {
    const trimmed = space.trim()
    if (!trimmed || DEFAULT_SET.has(trimmed) || customSpaces.value.includes(trimmed)) return
    customSpaces.value = [...customSpaces.value, trimmed]
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customSpaces.value))
    }
  }

  // 기본 공간 + 사용자 정의 공간 합쳐서 순서대로 반환 (칩 렌더링용)
  const allSpaceChips = computed<string[]>(() => [
    ...(DEFAULT_SPACES as readonly string[]),
    ...customSpaces.value,
  ])

  return { customSpaces, addCustomSpace, allSpaceChips }
}
