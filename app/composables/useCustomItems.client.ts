// 사용자 정의 항목(공간/제품) 관리를 위한 공통 팩토리
// useCustomSpaces / useCustomTopics가 이 팩토리를 공유

interface CustomItemsConfig {
  /** IndexedDB settings 스토어 키 */
  idbKey: string
  idbRenamedKey: string
  /** 일회성 마이그레이션용 구 localStorage 키 */
  lsKey: string
  lsRenamedKey: string
  /** 기본 항목 목록 */
  defaults: readonly string[]
  /** useState 키 — useBackup 등이 직접 참조하므로 고정 */
  stateKey: string
  renamedStateKey: string
  /** 중복 검사 함수 (기본: 대소문자 구분 exact match) */
  isDuplicate?: (existing: string[], trimmed: string) => boolean
}

export function createCustomItemsComposable(config: CustomItemsConfig) {
  const DEFAULT_SET = new Set<string>(config.defaults)

  const customItems     = useState<string[]>(config.stateKey,         () => [])
  const renamedDefaults = useState<Record<string, string>>(config.renamedStateKey, () => ({}))

  const effectiveDefaults = computed<string[]>(() =>
    (config.defaults as readonly string[]).map(name => renamedDefaults.value[name] ?? name),
  )

  const allChips = computed<string[]>(() => [
    ...effectiveDefaults.value,
    ...customItems.value,
  ])

  // ── IndexedDB 읽기/쓰기 ────────────────────────────────────────────────────

  async function saveToDb(): Promise<void> {
    const db = await useDb()
    // Vue reactive Proxy는 IndexedDB structured clone이 불가하므로 toRaw()로 벗김
    await db.put('settings', { key: config.idbKey,        value: toRaw(customItems.value) })
    await db.put('settings', { key: config.idbRenamedKey, value: toRaw(renamedDefaults.value) })
  }

  // ── 초기화 (IDB 로드 + localStorage 일회성 마이그레이션) ──────────────────

  let _loadPromise: Promise<void> | null = null

  async function load(): Promise<void> {
    const db = await useDb()

    const itemsEntry   = await db.get('settings', config.idbKey)
    const renamedEntry = await db.get('settings', config.idbRenamedKey)

    if (itemsEntry !== undefined || renamedEntry !== undefined) {
      if (itemsEntry)   customItems.value    = itemsEntry.value as string[]
      if (renamedEntry) renamedDefaults.value = renamedEntry.value as Record<string, string>
      return
    }

    // IDB에 없으면 localStorage에서 일회성 마이그레이션
    try {
      const raw = localStorage.getItem(config.lsKey)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed)) {
          customItems.value = (parsed as unknown[])
            .filter((s): s is string => typeof s === 'string' && !DEFAULT_SET.has(s))
        }
        localStorage.removeItem(config.lsKey)
      }
    } catch { /* ignore */ }

    try {
      const rawRenamed = localStorage.getItem(config.lsRenamedKey)
      if (rawRenamed) {
        const parsed = JSON.parse(rawRenamed) as unknown
        if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
          renamedDefaults.value = parsed as Record<string, string>
        }
        localStorage.removeItem(config.lsRenamedKey)
      }
    } catch { /* ignore */ }

    await saveToDb()
  }

  // ── 반환되는 composable 함수 ───────────────────────────────────────────────

  const defaultIsDuplicate = (existing: string[], trimmed: string): boolean =>
    existing.includes(trimmed)

  return () => {
    if (import.meta.client) {
      if (!_loadPromise) _loadPromise = load().catch(console.error) as Promise<void>
    }

    const addItem = (item: string): void => {
      const trimmed = item.trim()
      if (!trimmed || DEFAULT_SET.has(trimmed)) return
      const checkDup = config.isDuplicate ?? defaultIsDuplicate
      if (checkDup(customItems.value, trimmed)) return
      customItems.value = [...customItems.value, trimmed]
      saveToDb().catch(console.error)
    }

    const renameItem = (oldName: string, newName: string): void => {
      const originalDefault = (config.defaults as readonly string[]).find(
        d => (renamedDefaults.value[d] ?? d) === oldName,
      )
      if (originalDefault) {
        renamedDefaults.value = { ...renamedDefaults.value, [originalDefault]: newName }
      } else {
        const idx = customItems.value.indexOf(oldName)
        if (idx === -1) return
        const updated = [...customItems.value]
        updated[idx] = newName
        customItems.value = updated
      }
      saveToDb().catch(console.error)
    }

    return { customItems, renamedDefaults, addItem, renameItem, allChips, effectiveDefaults }
  }
}
