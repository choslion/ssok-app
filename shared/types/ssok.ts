// Core domain types for SSOK.
// This file lives in shared/ — pure TypeScript only, no Vue/Nitro imports.
// Field names defined in .claude/rules/schema.md (single source of truth).

// ── Item ─────────────────────────────────────────────────────────────────────

export type ItemDocType = 'receipt' | 'warranty' | 'manual'

export interface Item {
  id: string
  title: string              // Display name (required)
  type: ItemDocType          // Document purpose / category (required)
  attachmentIds: string[]    // Ordered Attachment IDs (required; may be empty)
  topic?: string             // Product group (e.g. TV, 냉장고)
  space?: string             // Location (e.g. 거실, 주방)
  price?: number             // Purchase price
  store?: string             // Store / merchant name
  purchaseDate?: string      // ISO date "YYYY-MM-DD"
  warrantyUntil?: string     // ISO date "YYYY-MM-DD" — warranty expiry
}

// ── Attachment ────────────────────────────────────────────────────────────────

export type AttachmentKind    = 'image' | 'pdf'                    // file format
export type AttachmentDocType = 'receipt' | 'warranty' | 'manual'  // document purpose

export interface Attachment {
  id: string
  itemId: string
  kind: AttachmentKind      // File format — how it is stored
  type: AttachmentDocType   // Document purpose — what it is
  mime: string              // e.g. "image/jpeg", "application/pdf"
  blob: Blob                // Stored in IndexedDB; never loaded on list screen
  createdAt: string         // ISO datetime string
}

// ── ReceiptExtract (Phase 1) ──────────────────────────────────────────────────

export interface ReceiptCandidate {
  value: string
  confidence: number        // 0–1
}

export interface ReceiptExtract {
  attachmentId: string
  rawText?: string
  merchant?: ReceiptCandidate
  date?: ReceiptCandidate
  amount?: ReceiptCandidate
  // Values the user explicitly applied from the candidates
  appliedMerchant?: string
  appliedDate?: string
  appliedAmount?: number
}
