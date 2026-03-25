import type { AttachmentDocType } from '~~/shared/types/ssok'
import type { OcrResult, OcrProgress } from '~/composables/useOcr.client'
import { compressImage } from '~/utils/compressImage.client'

const DOC_TYPE_PREFIX: Record<AttachmentDocType, string> = {
  receipt:  '영수증',
  warranty: '보증서',
  manual:   '설명서',
}

function renameForCamera(file: File, docType: AttachmentDocType, seqNum: number): File {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
  const num = String(seqNum).padStart(2, '0')
  const newName = `${DOC_TYPE_PREFIX[docType]}_${num}${ext}`
  return new File([file], newName, { type: file.type })
}

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

  async function addFiles(files: File[], docType: AttachmentDocType, fromCamera = false): Promise<void> {
    for (const file of files) {
      let renamed = file
      if (fromCamera) {
        const existing = pendingFiles.value.filter(pf => pf.docType === docType).length
        renamed = renameForCamera(file, docType, existing + 1)
      }
      const compressed = await compressImage(renamed)
      pendingFiles.value.push({
        id: crypto.randomUUID(),
        file: compressed,
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
