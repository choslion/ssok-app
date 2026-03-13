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

// ── 보증 상태 ──────────────────────────────────────────────────────────────────

export interface WarrantyStatus { label: string; type: 'normal' | 'soon' | 'expired' }

export function warrantyStatus(endDate: string | undefined): WarrantyStatus {
  if (!endDate) return { label: '보증 정보 없음', type: 'expired' }
  const diffDays = Math.floor((new Date(endDate).getTime() - Date.now()) / 86_400_000)
  if (diffDays < 0)   return { label: '보증 만료',          type: 'expired' }
  if (diffDays <= 30) return { label: '만료 D-' + diffDays, type: 'soon' }
  return { label: '보증 ' + formatDate(endDate) + '까지',   type: 'normal' }
}
