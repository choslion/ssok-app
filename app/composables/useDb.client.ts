import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Item, Attachment, ReceiptExtract } from '~~/shared/types/ssok'

// ── Schema ────────────────────────────────────────────────────────────────────

interface SsokDB extends DBSchema {
  items: {
    key: string
    value: Item
    indexes: {
      purchaseDate: string
      type: string
      space: string
    }
  }
  attachments: {
    key: string
    value: Attachment
    indexes: {
      itemId: string
    }
  }
  receiptExtracts: {
    key: string
    value: ReceiptExtract
  }
}

// ── Singleton connection ───────────────────────────────────────────────────────
// Module-level variable — one DB connection shared across all composables.

let _db: IDBPDatabase<SsokDB> | null = null

export const useDb = async (): Promise<IDBPDatabase<SsokDB>> => {
  if (_db) return _db

  _db = await openDB<SsokDB>('ssok-db', 3, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        // Fresh install — create all stores
        const itemStore = db.createObjectStore('items', { keyPath: 'id' })
        itemStore.createIndex('purchaseDate', 'purchaseDate')
        itemStore.createIndex('type', 'type')
        itemStore.createIndex('space', 'space')

        const attachmentStore = db.createObjectStore('attachments', { keyPath: 'id' })
        attachmentStore.createIndex('itemId', 'itemId')

        db.createObjectStore('receiptExtracts', { keyPath: 'attachmentId' })
      } else if (oldVersion === 1) {
        // v1 → v2: replace categoryId index with type on items store
        const itemStore = transaction.objectStore('items')
        if (itemStore.indexNames.contains('categoryId')) {
          itemStore.deleteIndex('categoryId')
        }
        if (!itemStore.indexNames.contains('type')) {
          itemStore.createIndex('type', 'type')
        }
      }
      if (oldVersion < 3) {
        // v2 → v3: add space index on items store (공간별 필터링 지원)
        const itemStore = transaction.objectStore('items')
        if (!itemStore.indexNames.contains('space')) {
          itemStore.createIndex('space', 'space')
        }
      }
    },
  })

  return _db
}
