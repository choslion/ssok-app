<template>
  <div class="edit-page">

    <!-- 로딩 -->
    <div v-if="loading" class="edit-state" aria-live="polite">불러오는 중…</div>

    <!-- 항목 없음 -->
    <div v-else-if="!found" class="edit-state">
      <p>항목을 찾을 수 없습니다.</p>
      <NuxtLink to="/" class="back-link">← 목록으로</NuxtLink>
    </div>

    <!-- 수정 폼 -->
    <template v-else>

      <div class="edit-page__nav">
        <NuxtLink :to="'/item/' + itemId" class="back-link" aria-label="상세 화면으로 돌아가기">
          <span aria-hidden="true">←</span> 돌아가기
        </NuxtLink>
        <h1 class="edit-page__title">항목 수정</h1>
      </div>

      <form novalidate @submit.prevent="submit">

        <!-- ── 기본 정보 ──────────────────────────────────────── -->
        <section class="form-section">
          <h2 class="form-section__heading">기본 정보</h2>

          <div class="field" :class="{ 'field--error': errors.title }">
            <label class="field__label" for="f-name">제품명 <span class="required" aria-hidden="true">*</span></label>
            <div class="field__input-wrap">
              <input
                id="f-name"
                v-model="form.title"
                class="field__input"
                :class="{ 'field__input--clearable': form.title }"
                type="text"
                placeholder="예: 아이폰 15 Pro"
                autocomplete="off"
                required
                aria-required="true"
                :aria-invalid="!!errors.title"
                :aria-describedby="errors.title ? 'f-name-error' : undefined"
              />
              <button v-if="form.title" type="button" class="field__clear" aria-label="제품명 지우기" @click="form.title = ''">✕</button>
            </div>
            <p v-if="errors.title" id="f-name-error" class="field__error" role="alert">{{ errors.title }}</p>
          </div>

          <div class="field" :class="{ 'field--error': errors.purchaseDate }">
            <label class="field__label" for="f-date">구매일 <span class="required" aria-hidden="true">*</span></label>
            <div class="field__input-wrap">
              <input
                id="f-date"
                v-model="form.purchaseDate"
                class="field__input"
                :class="{ 'field__input--clearable': form.purchaseDate }"
                type="date"
                min="1900-01-01"
                :max="todayIso()"
                required
                aria-required="true"
                :aria-invalid="!!errors.purchaseDate"
                :aria-describedby="errors.purchaseDate ? 'f-date-error' : undefined"
                @blur="clampPurchaseDate"
              />
              <button v-if="form.purchaseDate" type="button" class="field__clear" aria-label="구매일 지우기" @click="form.purchaseDate = ''">✕</button>
            </div>
            <p v-if="errors.purchaseDate" id="f-date-error" class="field__error" role="alert">{{ errors.purchaseDate }}</p>
          </div>

          <div class="field" :class="{ 'field--error': errors.store }">
            <label class="field__label" for="f-store">구매처 <span class="required" aria-hidden="true">*</span></label>
            <div class="field__input-wrap">
              <input
                id="f-store"
                v-model="form.store"
                class="field__input"
                :class="{ 'field__input--clearable': form.store }"
                type="text"
                placeholder="예: 쿠팡, 삼성 디지털프라자"
                autocomplete="off"
                required
                aria-required="true"
                :aria-invalid="!!errors.store"
                :aria-describedby="errors.store ? 'f-store-error' : undefined"
              />
              <button v-if="form.store" type="button" class="field__clear" aria-label="구매처 지우기" @click="form.store = ''">✕</button>
            </div>
            <p v-if="errors.store" id="f-store-error" class="field__error" role="alert">{{ errors.store }}</p>
          </div>

          <div class="field" :class="{ 'field--error': errors.warrantyMonths }">
            <label class="field__label" for="f-warranty">보증 기간 <span class="required" aria-hidden="true">*</span></label>
            <div class="field__input-row">
              <input
                id="f-warranty"
                v-model.number="form.warrantyMonths"
                class="field__input field__input--short"
                type="number"
                min="0"
                max="240"
                placeholder="12"
                required
                aria-required="true"
                :aria-invalid="!!errors.warrantyMonths"
                :aria-describedby="errors.warrantyMonths ? 'f-warranty-error' : undefined"
              />
              <span class="field__unit" aria-hidden="true">개월</span>
              <button v-if="form.warrantyMonths !== ''" type="button" class="field__clear field__clear--inline" aria-label="보증 기간 지우기" @click="form.warrantyMonths = ''">✕</button>
            </div>
            <p v-if="errors.warrantyMonths" id="f-warranty-error" class="field__error" role="alert">{{ errors.warrantyMonths }}</p>
          </div>
        </section>

        <!-- ── 추가 정보 ──────────────────────────────────────── -->
        <section class="form-section">
          <h2 class="form-section__heading">
            추가 정보 <span class="form-section__optional">(선택)</span>
          </h2>

          <div class="field">
            <label class="field__label" for="f-amount">구매 금액</label>
            <div class="field__input-row">
              <input
                id="f-amount"
                :value="priceDisplay"
                class="field__input field__input--short"
                type="text"
                inputmode="numeric"
                placeholder="0"
                aria-label="구매 금액 입력, 숫자만"
                @input="onPriceInput"
              />
              <span class="field__unit" aria-hidden="true">원</span>
              <button v-if="form.price != null" type="button" class="field__clear field__clear--inline" aria-label="구매 금액 지우기" @click="clearPrice">✕</button>
            </div>
          </div>
        </section>

        <!-- ── 제출 오류 ───────────────────────────────────────── -->
        <p v-if="errors.submit" class="submit-error" role="alert">{{ errors.submit }}</p>

        <!-- ── 저장 버튼 ──────────────────────────────────────── -->
        <div class="form-footer">
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? '저장 중…' : '저장하기' }}
          </button>
        </div>

      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
// ── 라우트 ────────────────────────────────────────────────────────────────────

const route = useRoute()
const router = useRouter()
const itemId = route.params.id as string

// ── composables ───────────────────────────────────────────────────────────────

const { getItem, updateItem } = useItems()

// ── 상태 ──────────────────────────────────────────────────────────────────────

const loading = ref(true)
const found = ref(false)
const submitting = ref(false)

const form = reactive({
  title: '',
  purchaseDate: '',
  store: '',
  warrantyMonths: 12 as number | '',
  price: undefined as number | undefined,
})

const errors = reactive<Record<string, string>>({})

// ── 초기 로드 ──────────────────────────────────────────────────────────────────

onMounted(async () => {
  const item = await getItem(itemId)
  if (item) {
    form.title = item.title
    form.purchaseDate = item.purchaseDate ?? ''
    form.store = item.store ?? ''
    // reverse-compute warrantyMonths from warrantyUntil and purchaseDate
    if (item.warrantyUntil && item.purchaseDate) {
      const from = new Date(item.purchaseDate)
      const to   = new Date(item.warrantyUntil)
      form.warrantyMonths = (to.getFullYear() - from.getFullYear()) * 12
        + (to.getMonth() - from.getMonth())
    } else {
      form.warrantyMonths = 12
    }
    setPrice(item.price)
    found.value = true
  }
  loading.value = false
})

// ── 구매 금액 포맷 (천 단위 구분자) ─────────────────────────────────────────────

const { priceDisplay, onPriceInput, clearPrice, setPrice } = usePriceInput(toRef(form, 'price'))

// ── helpers ────────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

function clampPurchaseDate(): void {
  if (!form.purchaseDate) return
  const year = new Date(form.purchaseDate).getFullYear()
  if (year > new Date().getFullYear()) {
    form.purchaseDate = todayIso()
  } else if (year < 1900) {
    form.purchaseDate = '1900-01-01'
  }
}

function warrantyEndDate(purchaseDate: string, months: number): string {
  const d = new Date(purchaseDate)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0] ?? ''
}

// ── validation ─────────────────────────────────────────────────────────────────

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]

  if (!form.title.trim())
    errors.title = '제품명을 입력해 주세요.'

  if (!form.purchaseDate) {
    errors.purchaseDate = '구매일을 선택해 주세요.'
  } else {
    const year = new Date(form.purchaseDate).getFullYear()
    const thisYear = new Date().getFullYear()
    if (year < 1900 || year > thisYear)
      errors.purchaseDate = `구매일은 1900년부터 ${thisYear}년 사이로 입력해 주세요.`
  }

  if (!form.store.trim())
    errors.store = '구매처를 입력해 주세요.'

  if (form.warrantyMonths === '' || typeof form.warrantyMonths !== 'number' || isNaN(form.warrantyMonths))
    errors.warrantyMonths = '보증 기간을 입력해 주세요.'
  else if (form.warrantyMonths < 0)
    errors.warrantyMonths = '보증 기간은 0개월 이상이어야 합니다.'

  return Object.keys(errors).length === 0
}

// ── submit ─────────────────────────────────────────────────────────────────────

async function submit(): Promise<void> {
  if (!validate()) return

  submitting.value = true
  try {
    const months = form.warrantyMonths as number
    await updateItem(itemId, {
      title: form.title.trim(),
      purchaseDate: form.purchaseDate,
      store: form.store.trim(),
      warrantyUntil: warrantyEndDate(form.purchaseDate, months),
      price: form.price != null && form.price > 0 ? form.price : undefined,
    })
    await router.push('/item/' + itemId)
  } catch (err) {
    console.error('[edit] 저장 오류:', err)
    errors.submit = '저장 중 오류가 발생했습니다. 다시 시도해 주세요.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.edit-page {
  padding-bottom: var(--space-7);

  &__nav {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-5);
    margin-bottom: var(--space-4);
  }

  &__title {
    font-size: 1.375rem;
    font-weight: 800;
    color: var(--color-text);
    letter-spacing: -0.02em;
  }
}

// ── 로딩 / 오류 ───────────────────────────────────────────────────────────────

.edit-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-7) var(--space-5);
  text-align: center;
  color: var(--color-sub);
  font-size: 0.9375rem;
}

// ── back link ─────────────────────────────────────────────────────────────────

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.875rem;
  color: var(--color-sub);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);

  &:hover { color: var(--color-text); }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    color: var(--color-text);
  }
}

// ── form sections ─────────────────────────────────────────────────────────────

.form-section {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-card);

  &__heading {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: var(--space-4);
  }

  &__optional {
    font-size: 0.8125rem;
    font-weight: 400;
    color: var(--color-sub);
  }
}

// ── field ─────────────────────────────────────────────────────────────────────

.field {
  margin-bottom: var(--space-4);

  &:last-child { margin-bottom: 0; }

  &__label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }

  &__input-wrap {
    position: relative;
  }

  &__input {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 1rem;
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-bg);
    transition: border-color var(--transition-fast);
    appearance: none;

    // 숫자 스피너 제거
    &[type="number"] {
      -moz-appearance: textfield;
      appearance: textfield;
      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button { display: none; }
    }

    &::placeholder { color: var(--color-sub); }

    &:focus-visible {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.18);
    }

    &--short { width: 120px; }

    &--clearable { padding-right: 2.25rem; }

    &.field__textarea {
      width: 100%;
      resize: vertical;
      min-height: 80px;
    }
  }

  &__input-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  &__unit {
    font-size: 0.875rem;
    color: var(--color-sub);
  }

  &__clear {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.5rem;
    color: var(--color-sub);
    background: var(--color-border);
    border-radius: 50%;
    transition: color var(--transition-fast), background var(--transition-fast);

    &:hover {
      color: var(--color-text);
      background: #CED4DA;
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 1px;
    }

    &--textarea {
      top: var(--space-3);
      transform: none;
    }

    &--inline {
      position: static;
      transform: none;
      flex-shrink: 0;
    }
  }

  &__error {
    margin-top: var(--space-1);
    font-size: 0.8125rem;
    color: #E03131;
  }

  &--error .field__input {
    border-color: #E03131;
  }
}

.required {
  color: var(--color-primary);
  margin-left: 2px;
}

// ── submit error ──────────────────────────────────────────────────────────────

.submit-error {
  font-size: 0.875rem;
  color: #E03131;
  text-align: center;
  margin-bottom: var(--space-3);
}

// ── footer / submit button ────────────────────────────────────────────────────

.form-footer {
  padding-top: var(--space-2);
}

.btn-primary {
  display: block;
  width: 100%;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-btn-text);
  font-size: 1rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity var(--transition-fast);

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(:disabled):hover { opacity: 0.88; }
  &:not(:disabled):active { opacity: 0.75; }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.35);
  }
}
</style>
