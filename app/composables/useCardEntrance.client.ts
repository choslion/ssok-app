import type { Ref } from 'vue'

/**
 * 카드 목록 stagger 진입 애니메이션 — 동일한 효과를 모든 페이지에서 재사용한다.
 *
 * 사용법:
 *   const listRef = ref<HTMLElement | null>(null)
 *   const { runEntrance } = useCardEntrance(listRef, ':scope > li')
 *   onMounted(async () => { await runEntrance() })
 */
export function useCardEntrance(
  listRef: Ref<HTMLElement | null>,
  itemSelector = ':scope > *',
) {
  async function runEntrance(): Promise<void> {
    if (!import.meta.client) return
    const { gsap } = await import('gsap')
    await nextTick()
    const cards = listRef.value?.querySelectorAll(itemSelector)
    if (!cards?.length) return
    gsap.from(cards, {
      opacity: 0,
      y: 14,
      duration: 0.25,
      stagger: 0.04,
      ease: 'power2.out',
    })
  }

  return { runEntrance }
}
