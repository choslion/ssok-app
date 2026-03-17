// 공유 포맷 유틸 — pure TypeScript, Vue/Nitro 의존성 없음
// shared/ 규칙: app/과 server/ 양쪽에서 임포트 가능

import type { ItemDocType } from '../types/ssok'

// ── 상수 ──────────────────────────────────────────────────────────────────────

export const TYPE_LABELS: Record<ItemDocType, string> = {
  receipt:  '영수증',
  warranty: '보증서',
  manual:   '설명서',
}

// ── 날짜 / 금액 ───────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일'
}

export function formatAmount(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

// ── 날짜 헬퍼 ─────────────────────────────────────────────────────────────────

export function todayIso(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

/** 구매일 문자열을 유효 범위(1900 ~ 올해)로 클램핑 */
export function clampPurchaseDateStr(dateStr: string): string {
  const year = new Date(dateStr).getFullYear()
  if (year > new Date().getFullYear()) return todayIso()
  if (year < 1900) return '1900-01-01'
  return dateStr
}

/** 구매일 + 보증 개월 수로 보증 만료일 계산 */
export function warrantyEndDate(purchaseDate: string, months: number): string {
  const d = new Date(purchaseDate)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0] ?? ''
}

/** defaults + extras(case-insensitive dedup) 칩 목록 병합 */
export function mergeChips(defaults: string[], extras: string[]): string[] {
  const seen = new Set(defaults.map(t => t.toLowerCase()))
  return [...defaults, ...extras.filter(t => !seen.has(t.toLowerCase()))]
}

// ── 보증 상태 ──────────────────────────────────────────────────────────────────

export interface WarrantyStatus { label: string; type: 'normal' | 'soon' | 'expired' }

export function warrantyStatus(endDate: string | undefined): WarrantyStatus {
  if (!endDate) return { label: '보증 정보 없음', type: 'expired' }
  const diffDays = Math.floor((new Date(endDate).getTime() - Date.now()) / 86_400_000)
  if (diffDays < 0)   return { label: '보증 만료',          type: 'expired' }
  if (diffDays <= 30) return { label: '만료 D-' + diffDays, type: 'soon' }
  return { label: '보증 ' + formatDate(endDate) + '까지',   type: 'normal' }
}
