// 사용자 정의 제품 목록을 localStorage에 저장/복원
// 기본 제품과 중복되지 않도록 필터링

const STORAGE_KEY = 'ssok-custom-topics'
const RENAMED_DEFAULTS_KEY = 'ssok-renamed-default-topics'

export const DEFAULT_TOPICS = ['TV', '냉장고'] as const
const DEFAULT_SET = new Set<string>(DEFAULT_TOPICS)

export const useCustomTopics = () => {
  const customTopics = useState<string[]>('customTopics', () => {
    if (!import.meta.client) return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as unknown) : []
      if (!Array.isArray(parsed)) return []
      // 기본 제품과 중복 제거, 문자열만 허용
      return (parsed as unknown[])
        .filter((s): s is string => typeof s === 'string' && !DEFAULT_SET.has(s))
    } catch {
      return []
    }
  })

  // 기본 제품 이름 변경 맵: { 원래이름 → 새이름 }  (예: { 'TV': '텔레비전' })
  const renamedDefaultTopics = useState<Record<string, string>>('renamedDefaultTopics', () => {
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

  // 이름 변경이 반영된 기본 제품 목록 (예: ['텔레비전', '냉장고'])
  const effectiveDefaultTopics = computed<string[]>(() =>
    (DEFAULT_TOPICS as readonly string[]).map(name => renamedDefaultTopics.value[name] ?? name),
  )

  // 사용자 정의 제품 추가 (기본 제품 · 중복 무시)
  const addCustomTopic = (topic: string): void => {
    const trimmed = topic.trim()
    if (!trimmed || DEFAULT_SET.has(trimmed)) return
    const lower = trimmed.toLowerCase()
    if (customTopics.value.some(t => t.toLowerCase() === lower)) return
    customTopics.value = [...customTopics.value, trimmed]
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customTopics.value))
    }
  }

  // 기본 제품 + 사용자 정의 제품 합쳐서 반환 (이름 변경 반영, 칩 렌더링용)
  const allTopicChips = computed<string[]>(() => [
    ...effectiveDefaultTopics.value,
    ...customTopics.value,
  ])

  // 제품 이름 변경 — 기본 제품·커스텀 제품 모두 처리
  const renameCustomTopic = (oldName: string, newName: string): void => {
    // 기본 제품 이름 변경: 원래 이름 또는 현재 유효 이름으로 탐색
    const originalDefault = (DEFAULT_TOPICS as readonly string[]).find(
      d => (renamedDefaultTopics.value[d] ?? d) === oldName,
    )
    if (originalDefault) {
      renamedDefaultTopics.value = { ...renamedDefaultTopics.value, [originalDefault]: newName }
      if (import.meta.client) {
        localStorage.setItem(RENAMED_DEFAULTS_KEY, JSON.stringify(renamedDefaultTopics.value))
      }
      return
    }
    // 커스텀 제품 이름 변경
    const idx = customTopics.value.indexOf(oldName)
    if (idx === -1) return
    const updated = [...customTopics.value]
    updated[idx] = newName
    customTopics.value = updated
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customTopics.value))
    }
  }

  return { customTopics, addCustomTopic, renameCustomTopic, allTopicChips, effectiveDefaultTopics }
}
