import type { Attachment } from '~~/shared/types/ssok'

// Holds attachments for the currently viewed item only.
// Never populated on the list screen — only loaded on /item/[id].
const attachments = useState<Attachment[]>('attachments', () => [])

export const useAttachments = () => {
  // ── Read ──────────────────────────────────────────────────────────────────

  /** Load all attachments for a given item (Blobs included). Call only on detail screen. */
  const loadAttachmentsByItemId = async (itemId: string): Promise<void> => {
    const db = await useDb()
    attachments.value = await db.getAllFromIndex('attachments', 'itemId', itemId)
  }

  const getAttachment = async (id: string): Promise<Attachment | undefined> => {
    const db = await useDb()
    return db.get('attachments', id)
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  const saveAttachment = async (attachment: Attachment): Promise<void> => {
    const db = await useDb()
    await db.put('attachments', attachment)
    const idx = attachments.value.findIndex(a => a.id === attachment.id)
    if (idx >= 0) attachments.value[idx] = attachment
    else attachments.value.push(attachment)
  }

  const deleteAttachment = async (id: string): Promise<void> => {
    const db = await useDb()
    await db.delete('attachments', id)
    attachments.value = attachments.value.filter(a => a.id !== id)
  }

  /** Clear local state when leaving the detail screen. */
  const clearAttachments = (): void => {
    attachments.value = []
  }

  return {
    attachments,
    loadAttachmentsByItemId,
    getAttachment,
    saveAttachment,
    deleteAttachment,
    clearAttachments,
  }
}
