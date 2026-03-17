import type { AttachmentDocType } from '~~/shared/types/ssok'
import type { OcrResult, OcrProgress } from '~/composables/useOcr.client'

export interface PendingFile {
  id: string           // pre-generated; used as Attachment.id and ReceiptExtract.attachmentId
  file: File
  docType: AttachmentDocType  // document purpose (receipt | warranty | manual)
  ocrState: 'idle' | 'running' | 'done' | 'error'
  ocrProgress: number  // 0–100
  ocrStatus: string
  ocrResult: OcrResult | null
  ocrError: string | null
}

export function usePendingFiles() {
  const { recognize } = useOcr()

  const pendingFiles = ref<PendingFile[]>([])

  function addFiles(files: File[], docType: AttachmentDocType): void {
    for (const file of files) {
      pendingFiles.value.push({
        id: crypto.randomUUID(),
        file,
        docType,
        ocrState: 'idle',
        ocrProgress: 0,
        ocrStatus: '',
        ocrResult: null,
        ocrError: null,
      })
    }
  }

  function removeFile(idx: number): void {
    pendingFiles.value.splice(idx, 1)
  }

  function syncDocType(docType: AttachmentDocType): void {
    for (const pf of pendingFiles.value) {
      pf.docType = docType
    }
  }

  async function runOcr(pf: PendingFile): Promise<void> {
    if (!import.meta.client) return
    if (!pf.file.type.startsWith('image/')) return

    pf.ocrState = 'running'
    pf.ocrProgress = 0
    pf.ocrError = null
    pf.ocrResult = null

    try {
      pf.ocrResult = await recognize(pf.file, (p: OcrProgress) => {
        pf.ocrProgress = p.percent
        pf.ocrStatus = p.status
      })
      pf.ocrState = 'done'
    } catch (err) {
      console.error('[OCR] 실패:', err)
      pf.ocrState = 'error'
      pf.ocrError = 'OCR 처리 중 오류가 발생했습니다. 다시 시도하거나 직접 입력해 주세요.'
    }
  }

  return { pendingFiles, addFiles, removeFile, syncDocType, runOcr }
}
