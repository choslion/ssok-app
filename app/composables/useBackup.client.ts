import type { Item, Attachment, AttachmentKind, AttachmentDocType, ReceiptExtract } from '~~/shared/types/ssok'

// ── 상수 ─────────────────────────────────────────────────────────────────────

const BACKUP_FORMAT_VERSION = 1

const DB_META = {
  name: 'ssok-db',
  version: 4,
  stores: {
    items:           { keyPath: 'id',           indexes: ['purchaseDate', 'type', 'space'] },
    attachments:     { keyPath: 'id',           indexes: ['itemId'] },
    receiptExtracts: { keyPath: 'attachmentId', indexes: [] },
    settings:        { keyPath: 'key',          indexes: [] },
  },
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg':      '.jpg',
    'image/jpg':       '.jpg',
    'image/png':       '.png',
    'image/webp':      '.webp',
    'image/gif':       '.gif',
    'application/pdf': '.pdf',
  }
  return map[mime] ?? '.bin'
}

function formatFilenameDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// ── 모듈-레벨 반응형 상태 ────────────────────────────────────────────────────

// 내보내기
const isExporting    = ref(false)
const exportProgress = ref(0)
const exportStep     = ref('준비 중…')
const exportError    = ref<string | null>(null)

// 가져오기
const isImporting      = ref(false)
const importProgress   = ref(0)
const importStep       = ref('준비 중…')
const importError      = ref<string | null>(null)
const importSuccess    = ref(false)
const importConfirming = ref(false)

// Phase B: 클라우드 저장 제안용 — export 완료 후 blob 보존
const cloudPrompt = ref<{ blob: Blob; filename: string } | null>(null)

// 마지막 백업 시각 — IndexedDB settings 스토어에서 로드
const lastBackupAt = ref<string | null>(null)
const lastBackupLabel = computed(() =>
  lastBackupAt.value ? formatDisplayDate(lastBackupAt.value) : '없음',
)

let _lastBackupLoaded = false

async function loadLastBackupAt(): Promise<void> {
  const db = await useDb()
  const entry = await db.get('settings', 'last-backup-at')
  if (entry) {
    lastBackupAt.value = entry.value as string
    return
  }
  // 일회성 localStorage 마이그레이션
  const legacy = localStorage.getItem('ssok-last-backup-at')
  if (legacy) {
    lastBackupAt.value = legacy
    await db.put('settings', { key: 'last-backup-at', value: legacy })
    localStorage.removeItem('ssok-last-backup-at')
  }
}

// ── 내보내기 ─────────────────────────────────────────────────────────────────

async function exportBackup(): Promise<void> {
  if (isExporting.value) return

  isExporting.value = true
  exportError.value = null
  exportProgress.value = 0
  exportStep.value = '데이터 읽는 중…'

  try {
    // 1. IndexedDB 전체 로드 (0 → 20%)
    const db = await useDb()
    const [items, attachments, extracts, settings] = await Promise.all([
      db.getAll('items'),
      db.getAll('attachments'),
      db.getAll('receiptExtracts'),
      db.getAll('settings'),
    ])
    exportProgress.value = 20

    // 2. JSZip 동적 임포트
    exportStep.value = '첨부 파일 압축 중…'
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const now = new Date()

    zip.file('meta.json', JSON.stringify({
      backupFormat: 'ssok-backup',
      backupFormatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: now.toISOString(),
      db: DB_META,
    }, null, 2))
    zip.file('items.json', JSON.stringify(items, null, 2))
    zip.file('receiptExtracts.json', JSON.stringify(extracts, null, 2))
    // last-backup-at 은 기기별 값이므로 settings에서 제외
    const settingsToExport = settings.filter(s => s.key !== 'last-backup-at')
    zip.file('settings.json', JSON.stringify(settingsToExport, null, 2))

    const attFolder = zip.folder('attachments')!
    const attMeta: Array<{
      id: string; itemId: string; kind: string; type: string
      mime: string; createdAt: string; fileName: string
    }> = []

    const total = attachments.length
    for (let i = 0; i < total; i++) {
      const att = attachments[i]!
      const ext = mimeToExt(att.mime)
      const fileName = `attachments/${att.id}${ext}`
      attFolder.file(`${att.id}${ext}`, att.blob)
      attMeta.push({ id: att.id, itemId: att.itemId, kind: att.kind, type: att.type, mime: att.mime, createdAt: att.createdAt, fileName })
      exportProgress.value = 20 + Math.round(((i + 1) / Math.max(total, 1)) * 50)
    }
    zip.file('attachments.json', JSON.stringify(attMeta, null, 2))
    exportProgress.value = 70

    // 3. ZIP Blob 생성 (70 → 90%)
    exportStep.value = '파일 생성 중…'
    const rawBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      ({ percent }) => { exportProgress.value = 70 + Math.round(percent * 0.2) },
    )
    // JSZip이 생성하는 Blob은 MIME 타입이 비어 있어 모바일 파일 피커가
    // ZIP으로 인식하지 못하는 문제가 있으므로 명시적으로 지정
    const zipBlob = new Blob([rawBlob], { type: 'application/zip' })
    exportProgress.value = 90

    // 4. 다운로드 (90 → 100%)
    exportStep.value = '다운로드 준비 중…'
    const filename = `SSOK_Backup_${formatFilenameDate(now)}.zip`

    // a.download 사용 — iOS 13+ Safari도 ZIP을 Files 앱 다운로드 폴더에 저장함.
    // Web Share API는 긴 async 작업 후 호출 시 NotAllowedError가 발생하므로 사용하지 않음.
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Phase B: blob 보존 → 클라우드 저장 제안 표시
    cloudPrompt.value = { blob: zipBlob, filename }

    exportProgress.value = 100
    exportStep.value = '완료!'
    const nowIso = now.toISOString()
    await db.put('settings', { key: 'last-backup-at', value: nowIso })
    lastBackupAt.value = nowIso

    await new Promise<void>(r => setTimeout(r, 1500))
  } catch (err) {
    console.error('[backup] 내보내기 오류:', err)
    exportError.value = err instanceof Error ? err.message : '백업 파일 생성 중 오류가 발생했습니다. 다시 시도해 주세요.'
  } finally {
    isExporting.value = false
    exportProgress.value = 0
    exportStep.value = '준비 중…'
  }
}

// ── Phase B: 클라우드 저장 제안 ──────────────────────────────────────────────

function dismissCloudPrompt(): void {
  cloudPrompt.value = null
}


// ── 가져오기 (복원) ───────────────────────────────────────────────────────────

type AttachmentMeta = {
  id: string; itemId: string; kind: string; type: string
  mime: string; createdAt: string; fileName: string
}

/** 백업 파일 구조·스키마 유효성 검사 */
function validateBackup(
  zip: import('jszip'),
  items: unknown,
  attMeta: unknown,
  extracts: unknown,
): void {
  if (!Array.isArray(items))
    throw new Error('items.json이 올바른 형식이 아닙니다.')
  if (!Array.isArray(attMeta))
    throw new Error('attachments.json이 올바른 형식이 아닙니다.')
  if (!Array.isArray(extracts))
    throw new Error('receiptExtracts.json이 올바른 형식이 아닙니다.')

  // 항목 ID 집합
  const itemIds = new Set((items as Item[]).map(i => i.id))

  // 첨부 파일: itemId 참조 + blob 파일 존재 확인
  for (const att of attMeta as AttachmentMeta[]) {
    if (!itemIds.has(att.itemId))
      throw new Error(`무결성 오류: 첨부 파일(${att.id})이 존재하지 않는 항목을 참조합니다.`)
    if (!zip.file(att.fileName))
      throw new Error(`첨부 파일 데이터가 누락되었습니다: ${att.fileName}`)
  }

  // receiptExtracts: attachmentId 참조 확인
  const attIds = new Set((attMeta as AttachmentMeta[]).map(a => a.id))
  for (const ex of extracts as ReceiptExtract[]) {
    if (!attIds.has(ex.attachmentId))
      throw new Error(`무결성 오류: 추출 데이터(${ex.attachmentId})가 존재하지 않는 첨부 파일을 참조합니다.`)
  }
}

function startImportConfirm(): void {
  importError.value   = null
  importSuccess.value = false
  importConfirming.value = true
}

function cancelImport(): void {
  importConfirming.value = false
}

// Dev note: Mobile file pickers (Android/iOS) often ignore custom extensions like
// .ssok-backup because they are not in the OS MIME-type registry. The file input
// `accept` attribute should include standard MIME types (application/zip,
// application/x-zip-compressed) so the picker shows ZIP files regardless of extension.
// Validation relies on ZIP structure + meta.json content, NOT the file extension.
async function importBackup(file: File): Promise<void> {
  if (isImporting.value) return

  isImporting.value    = true
  importError.value    = null
  importSuccess.value  = false
  importProgress.value = 0
  importStep.value     = '파일 읽는 중…'

  try {
    // 1. JSZip으로 파일 로드 (0 → 10%)
    const { default: JSZip } = await import('jszip')
    let zip: import('jszip')
    try {
      zip = await JSZip.loadAsync(file)
    } catch {
      throw new Error('ZIP 파일을 읽을 수 없습니다. SSOK 백업 파일(.zip)인지 확인해 주세요.')
    }
    importProgress.value = 10

    // 2. 필수 파일 존재 확인
    importStep.value = '유효성 검사 중…'
    const requiredFiles = ['meta.json', 'items.json', 'attachments.json', 'receiptExtracts.json']
    for (const name of requiredFiles) {
      if (!zip.file(name))
        throw new Error(`필수 파일이 누락된 백업 파일입니다: ${name}`)
    }

    // 3. JSON 파싱
    const metaText     = await zip.file('meta.json')!.async('text')
    const itemsText    = await zip.file('items.json')!.async('text')
    const attMetaText  = await zip.file('attachments.json')!.async('text')
    const extractsText = await zip.file('receiptExtracts.json')!.async('text')

    let meta: { backupFormatVersion?: number }
    try { meta = JSON.parse(metaText) } catch { throw new Error('meta.json을 읽을 수 없습니다.') }

    if (typeof meta.backupFormatVersion !== 'number' || meta.backupFormatVersion > BACKUP_FORMAT_VERSION)
      throw new Error('지원하지 않는 백업 포맷 버전입니다.')

    let items: unknown, attMeta: unknown, extracts: unknown
    try { items    = JSON.parse(itemsText)    } catch { throw new Error('items.json을 읽을 수 없습니다.') }
    try { attMeta  = JSON.parse(attMetaText)  } catch { throw new Error('attachments.json을 읽을 수 없습니다.') }
    try { extracts = JSON.parse(extractsText) } catch { throw new Error('receiptExtracts.json을 읽을 수 없습니다.') }

    // settings.json (선택적 — 구 백업 파일에는 없을 수 있음)
    let settingsData: Array<{ key: string; value: unknown }> | null = null
    const settingsFile = zip.file('settings.json')
    if (settingsFile) {
      try {
        const parsed = JSON.parse(await settingsFile.async('text')) as unknown
        if (Array.isArray(parsed)) settingsData = parsed as Array<{ key: string; value: unknown }>
      } catch { /* 무시 — settings 복원 건너뜀 */ }
    }

    // 4. 스키마 무결성 검사
    validateBackup(zip, items, attMeta, extracts)
    importProgress.value = 25

    // 5. 기존 DB 삭제 (25 → 30%)
    importStep.value = '기존 데이터 삭제 중…'
    const db = await useDb()
    await db.clear('items')
    await db.clear('attachments')
    await db.clear('receiptExtracts')
    // settings는 백업에 있을 때만 교체 (구 백업 호환성)
    if (settingsData !== null) await db.clear('settings')
    importProgress.value = 30

    // 6. items 복원 (30 → 35%)
    importStep.value = '항목 복원 중…'
    for (const item of items as Item[]) {
      await db.put('items', item)
    }
    importProgress.value = 35

    // 7. attachments 복원 — blob 재구성 (35 → 80%)
    importStep.value = '첨부 파일 복원 중…'
    const attMetaArr = attMeta as AttachmentMeta[]
    const total = attMetaArr.length
    for (let i = 0; i < total; i++) {
      const att = attMetaArr[i]!
      const arrayBuffer = await zip.file(att.fileName)!.async('arraybuffer')
      const blob = new Blob([arrayBuffer], { type: att.mime })
      await db.put('attachments', {
        id:        att.id,
        itemId:    att.itemId,
        kind:      att.kind as AttachmentKind,
        type:      att.type as AttachmentDocType,
        mime:      att.mime,
        blob,
        createdAt: att.createdAt,
      } satisfies Attachment)
      importProgress.value = 35 + Math.round(((i + 1) / Math.max(total, 1)) * 45)
    }

    // 8. receiptExtracts 복원 (80 → 88%)
    importStep.value = '추출 데이터 복원 중…'
    for (const ex of extracts as ReceiptExtract[]) {
      await db.put('receiptExtracts', ex)
    }
    importProgress.value = 88

    // 9. settings 복원 (88 → 92%)
    if (settingsData !== null) {
      importStep.value = '설정 복원 중…'
      for (const entry of settingsData) {
        await db.put('settings', entry)
      }
      // 반응형 상태 갱신 — 각 composable의 로드 프로미스를 초기화하여 재로드 유도
      // (useCustomSpaces / useCustomTopics는 모듈-레벨 캐시를 갖고 있으므로 직접 재로드)
      await reloadSettingsState(db)
    }
    importProgress.value = 92

    // 10. 전역 items 상태 갱신 (92 → 100%)
    await useItems().loadItems()
    importProgress.value = 100
    importStep.value = '복원 완료!'
    importSuccess.value = true

    await new Promise<void>(r => setTimeout(r, 500))
  } catch (err) {
    console.error('[backup] 가져오기 오류:', err)
    importError.value = err instanceof Error
      ? err.message
      : '복원 중 오류가 발생했습니다. 다시 시도해 주세요.'
  } finally {
    isImporting.value    = false
    importProgress.value = 0
    importStep.value     = '준비 중…'
  }
}

// settings 복원 후 반응형 상태 직접 갱신
async function reloadSettingsState(db: Awaited<ReturnType<typeof useDb>>): Promise<void> {
  const getVal = async (key: string) => (await db.get('settings', key))?.value

  // useCustomSpaces 상태
  const spaces = await getVal('custom-spaces')
  if (Array.isArray(spaces)) {
    useState<string[]>('customSpaces').value = spaces as string[]
  }
  const renamedSpaces = await getVal('renamed-default-spaces')
  if (renamedSpaces && typeof renamedSpaces === 'object' && !Array.isArray(renamedSpaces)) {
    useState<Record<string, string>>('renamedDefaultSpaces').value = renamedSpaces as Record<string, string>
  }

  // useCustomTopics 상태
  const topics = await getVal('custom-topics')
  if (Array.isArray(topics)) {
    useState<string[]>('customTopics').value = topics as string[]
  }
  const renamedTopics = await getVal('renamed-default-topics')
  if (renamedTopics && typeof renamedTopics === 'object' && !Array.isArray(renamedTopics)) {
    useState<Record<string, string>>('renamedDefaultTopics').value = renamedTopics as Record<string, string>
  }
}

// ── 컴포저블 인터페이스 ────────────────────────────────────────────────────────

export const useBackup = () => {
  // 첫 호출 시 lastBackupAt 자동 로드
  if (import.meta.client && !_lastBackupLoaded) {
    _lastBackupLoaded = true
    loadLastBackupAt().catch(console.error)
  }

  return {
    // 내보내기
    isExporting:    readonly(isExporting),
    exportProgress: readonly(exportProgress),
    exportStep:     readonly(exportStep),
    exportError:    readonly(exportError),
    exportBackup,
    // Phase B: 클라우드 저장 제안
    cloudPrompt:        readonly(cloudPrompt),
    dismissCloudPrompt,
    // 가져오기
    isImporting:      readonly(isImporting),
    importProgress:   readonly(importProgress),
    importStep:       readonly(importStep),
    importError:      readonly(importError),
    importSuccess:    readonly(importSuccess),
    importConfirming: readonly(importConfirming),
    startImportConfirm,
    cancelImport,
    importBackup,
    // 공통
    lastBackupAt:   readonly(lastBackupAt),
    lastBackupLabel,
  }
}
