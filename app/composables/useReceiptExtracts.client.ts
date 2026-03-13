import type { ReceiptExtract } from '~~/shared/types/ssok'

// Holds the extract for the currently active attachment.
const extract = useState<ReceiptExtract | null>('receiptExtract', () => null)

export const useReceiptExtracts = () => {
  // ── Read ──────────────────────────────────────────────────────────────────

  const loadExtract = async (attachmentId: string): Promise<void> => {
    const db = await useDb()
    extract.value = (await db.get('receiptExtracts', attachmentId)) ?? null
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  const saveExtract = async (data: ReceiptExtract): Promise<void> => {
    const db = await useDb()
    await db.put('receiptExtracts', data)
    extract.value = data
  }

  const deleteExtract = async (attachmentId: string): Promise<void> => {
    const db = await useDb()
    await db.delete('receiptExtracts', attachmentId)
    if (extract.value?.attachmentId === attachmentId) extract.value = null
  }

  const clearExtract = (): void => {
    extract.value = null
  }

  return { extract, loadExtract, saveExtract, deleteExtract, clearExtract }
}
