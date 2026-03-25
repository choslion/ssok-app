/**
 * 보증 만료 임박 알림 상태 관리
 * - D-0 ~ D-30 항목 카운트
 * - 세션 내 "확인 여부" 추적 (useState — 페이지 이동 간 유지, 새로고침 시 초기화)
 * - /expiring 방문 시 markSeen() → 빨간 점 + 배너 숨김
 */

function diffDays(endDate: string): number {
  return Math.floor((new Date(endDate).getTime() - Date.now()) / 86_400_000)
}

export function useExpiryNotice() {
  const { items } = useItems()

  const expiringCount = computed(() =>
    items.value.filter(item => {
      if (!item.warrantyUntil) return false
      const d = diffDays(item.warrantyUntil)
      return d >= 0 && d <= 30
    }).length
  )

  // 세션 전역 상태 — 탭 이동 시에도 유지됨
  const seen = useState('expiry-notice-seen', () => false)

  /** 만료 임박 항목이 있고 아직 확인 안 한 경우 true */
  const hasUnread = computed(() => expiringCount.value > 0 && !seen.value)

  /** /expiring 방문 또는 배너 닫기 시 호출 */
  function markSeen(): void {
    seen.value = true
  }

  return { expiringCount, hasUnread, markSeen }
}
