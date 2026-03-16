import type { Item } from '~~/shared/types/ssok'

// Global list of items — metadata only, no Blobs.
const items = useState<Item[]>('items', () => [])

export const useItems = () => {
  // ── Read ──────────────────────────────────────────────────────────────────

  const loadItems = async (): Promise<void> => {
    const db = await useDb()
    items.value = await db.getAll('items')
  }

  const getItem = async (id: string): Promise<Item | undefined> => {
    const db = await useDb()
    return db.get('items', id)
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  const saveItem = async (item: Item): Promise<void> => {
    const db = await useDb()
    await db.put('items', item)
    // Keep reactive list in sync
    const idx = items.value.findIndex(i => i.id === item.id)
    if (idx >= 0) items.value[idx] = item
    else items.value.push(item)
  }

  const updateItem = async (id: string, patch: Partial<Omit<Item, 'id'>>): Promise<void> => {
    const db = await useDb()
    const existing = await db.get('items', id)
    if (!existing) throw new Error(`Item not found: ${id}`)
    const updated: Item = { ...existing, ...patch }
    await db.put('items', updated)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx >= 0) items.value[idx] = updated
  }

  const deleteItem = async (id: string): Promise<void> => {
    const db = await useDb()
    await db.delete('items', id)
    items.value = items.value.filter(i => i.id !== id)
  }

  // 모든 항목에서 제품군 목록을 중복 없이 반환 (trim + case-fold 정규화, localeCompare 정렬)
  const getTopics = (): string[] => {
    const seen = new Map<string, string>() // lowercase key → trimmed display value
    for (const item of items.value) {
      if (!item.topic) continue
      const trimmed = item.topic.trim()
      if (!trimmed) continue
      const lower = trimmed.toLowerCase()
      if (!seen.has(lower)) seen.set(lower, trimmed)
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }

  return { items, loadItems, getItem, saveItem, updateItem, deleteItem, getTopics }
}
