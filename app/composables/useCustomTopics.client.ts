// 사용자 정의 제품군 목록을 localStorage에 저장/복원

const STORAGE_KEY = 'ssok-custom-topics'

export const useCustomTopics = () => {
  const customTopics = useState<string[]>('customTopics', () => {
    if (!import.meta.client) return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as unknown) : []
      if (!Array.isArray(parsed)) return []
      return (parsed as unknown[]).filter((s): s is string => typeof s === 'string')
    } catch {
      return []
    }
  })

  const addCustomTopic = (topic: string): void => {
    const trimmed = topic.trim()
    if (!trimmed) return
    // case-insensitive 중복 체크
    const lower = trimmed.toLowerCase()
    if (customTopics.value.some(t => t.toLowerCase() === lower)) return
    customTopics.value = [...customTopics.value, trimmed]
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customTopics.value))
    }
  }

  const allTopicChips = computed<string[]>(() => customTopics.value)

  return { customTopics, addCustomTopic, allTopicChips }
}
