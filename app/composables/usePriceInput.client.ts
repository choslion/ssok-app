// 가격 입력 포맷 컴포저블 (천 단위 구분자)
// form.price = 숫자 (저장값), priceDisplay = 표시용 문자열 ("19,900")
//
// 사용법:
//   const { priceDisplay, onPriceInput, clearPrice, setPrice } = usePriceInput(toRef(form, 'price'))

import { ref, type Ref } from 'vue'

export function usePriceInput(priceRef: Ref<number | undefined>) {
  // 초기 표시값 — 수정 페이지처럼 이미 값이 있을 때 바로 포맷
  const priceDisplay = ref(
    priceRef.value != null ? priceRef.value.toLocaleString('ko-KR') : ''
  )

  function onPriceInput(e: Event): void {
    const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '')
    const num = digits ? parseInt(digits, 10) : undefined
    priceRef.value = num
    const formatted = num != null ? num.toLocaleString('ko-KR') : ''
    ;(e.target as HTMLInputElement).value = formatted
    priceDisplay.value = formatted
  }

  function clearPrice(): void {
    priceRef.value = undefined
    priceDisplay.value = ''
  }

  // OCR 자동 적용 등 외부에서 직접 값을 설정할 때 사용
  function setPrice(price: number | undefined): void {
    priceRef.value = price
    priceDisplay.value = price != null ? price.toLocaleString('ko-KR') : ''
  }

  return { priceDisplay, onPriceInput, clearPrice, setPrice }
}
