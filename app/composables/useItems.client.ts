import { toRaw } from 'vue'
import type { Item } from '~~/shared/types/ssok'

export const useItems = () => {
  // useState는 동일 key로 항상 동일 상태를 반환하므로 전역 싱글턴처럼 동작
  const items = useState<Item[]>('items', () => [])
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

  // 공간 이름 일괄 변경 — oldName을 가진 모든 항목을 newName으로 업데이트
  const renameSpace = async (oldName: string, newName: string): Promise<void> => {
    const db = await useDb()
    const toUpdate = items.value.filter(i => i.space === oldName)
    for (const item of toUpdate) {
      const updated: Item = { ...toRaw(item), space: newName }
      await db.put('items', updated)
      const idx = items.value.findIndex(i => i.id === item.id)
      if (idx >= 0) items.value[idx] = updated
    }
  }

  // 제품 이름 일괄 변경 — oldName을 가진 모든 항목을 newName으로 업데이트
  const renameTopic = async (oldName: string, newName: string): Promise<void> => {
    const db = await useDb()
    const toUpdate = items.value.filter(i => i.topic === oldName)
    for (const item of toUpdate) {
      const updated: Item = { ...toRaw(item), topic: newName }
      await db.put('items', updated)
      const idx = items.value.findIndex(i => i.id === item.id)
      if (idx >= 0) items.value[idx] = updated
    }
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

  return { items, loadItems, getItem, saveItem, updateItem, deleteItem, renameSpace, renameTopic, getTopics }
}
