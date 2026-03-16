<template>
  <div class="add-page">

    <!-- 페이지 상단 내비 -->
    <PageHeader title="새 항목 추가" back="/" />

    <!-- 항목 종류 선택 (필수) -->
    <div ref="typeSelectorRef" class="type-selector" role="group" aria-label="항목 종류 선택 (필수)">
      <button
        v-for="t in TYPE_OPTIONS"
        :key="t.value"
        type="button"
        class="type-chip"
        :class="['type-chip--' + t.value, { 'type-chip--active': form.type === t.value }]"
        :aria-pressed="form.type === t.value"
        @click="selectType(t.value)"
      >{{ t.label }}</button>
    </div>

    <form novalidate @submit.prevent="submit">

      <!-- ── 기본 정보 ──────────────────────────────────────── -->
      <section class="form-section">
        <h2 class="form-section__heading">기본 정보</h2>

        <!-- 제품 -->
        <div class="field">
          <label class="field__label">
            제품 <span class="form-section__optional">(선택)</span>
          </label>
          <p class="field__hint">예: TV, 냉장고, 에어프라이어</p>
          <ChipRow
            v-model="topicChipComputed"
            :chips="allTopicChips"
            group-label="제품 빠른 선택"
            expand-label="제품 목록 더 보기"
            collapse-label="제품 목록 접기"
          />
          <div class="field__input-wrap topic-custom-input">
            <input
              v-model="topicCustom"
              class="field__input"
              :class="{ 'field__input--clearable': topicCustom }"
              type="text"
              placeholder="직접 입력"
              maxlength="20"
              aria-label="제품 직접 입력"
            />
            <button v-if="topicCustom" type="button" class="field__clear" aria-label="제품 지우기" @click="topicCustom = ''">✕</button>
          </div>
        </div>

        <!-- 제품명 -->
        <div class="field" :class="{ 'field--error': errors.title }">
          <label class="field__label" for="f-name">제품명 <span class="required" aria-hidden="true">*</span></label>
          <div class="field__input-wrap">
            <input
              id="f-name"
              ref="titleInput"
              v-model="form.title"
              class="field__input"
              :class="{ 'field__input--clearable': form.title }"
              type="text"
              placeholder="예: 아이폰 15 Pro"
              maxlength="20"
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

        <!-- 보관 장소 (설명서일 때 두드러지게 표시) -->
        <div class="field" :class="{ 'field--space-featured': form.type === 'manual' }">
          <label class="field__label">
            보관 장소
            <span v-if="form.type !== 'manual'" class="form-section__optional">(선택)</span>
          </label>
          <ChipRow
            v-model="spaceChipComputed"
            :chips="allSpaceChips"
            group-label="보관 장소 빠른 선택"
            expand-label="보관 장소 목록 더 보기"
            collapse-label="보관 장소 목록 접기"
          />
          <div class="field__input-wrap space-custom-input">
            <input
              v-model="spaceCustom"
              class="field__input"
              :class="{ 'field__input--clearable': spaceCustom }"
              type="text"
              placeholder="기타 (직접 입력)"
              maxlength="20"
              aria-label="보관 장소 직접 입력"
            />
            <button v-if="spaceCustom" type="button" class="field__clear" aria-label="보관 장소 지우기" @click="spaceCustom = ''">✕</button>
          </div>
        </div>

      </section>

      <!-- ── 구매 정보 ──────────────────────────────────────── -->
      <section class="form-section">
        <h2 class="form-section__heading">
          구매 정보 <span class="form-section__optional">(선택)</span>
        </h2>

        <!-- 구매일: 설명서일 때는 숨김 -->
        <div v-if="form.type !== 'manual'" class="field" :class="{ 'field--error': errors.purchaseDate }">
          <label class="field__label" for="f-date">구매일</label>
          <div class="field__input-wrap">
            <input
              id="f-date"
              ref="dateInput"
              v-model="form.purchaseDate"
              class="field__input"
              :class="{ 'field__input--clearable': form.purchaseDate }"
              type="date"
              min="1900-01-01"
              :max="todayIso()"
              aria-label="구매일 선택"
              :aria-invalid="!!errors.purchaseDate"
              :aria-describedby="errors.purchaseDate ? 'f-date-error' : undefined"
              @blur="clampPurchaseDate"
            />
            <button v-if="form.purchaseDate" type="button" class="field__clear" aria-label="구매일 지우기" @click="form.purchaseDate = ''">✕</button>
          </div>
          <p v-if="errors.purchaseDate" id="f-date-error" class="field__error" role="alert">{{ errors.purchaseDate }}</p>
        </div>

        <!-- 구매처 -->
        <div class="field">
          <label class="field__label" for="f-store">구매처</label>
          <div class="field__input-wrap">
            <input
              id="f-store"
              v-model="form.store"
              class="field__input"
              :class="{ 'field__input--clearable': form.store }"
              type="text"
              placeholder="예: 쿠팡, 삼성 디지털프라자"
              maxlength="15"
              autocomplete="off"
            />
            <button v-if="form.store" type="button" class="field__clear" aria-label="구매처 지우기" @click="form.store = ''">✕</button>
          </div>
        </div>

        <!-- 구매 금액 -->
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

        <!-- 보증 기간: 보증서 종류일 때만 표시 -->
        <div v-if="form.type === 'warranty'" class="field" :class="{ 'field--error': errors.warrantyMonths }">
          <label class="field__label" for="f-warranty">보증 기간</label>
          <div class="field__input-row">
            <input
              id="f-warranty"
              v-model.number="form.warrantyMonths"
              class="field__input field__input--short"
              type="number"
              min="0"
              max="240"
              placeholder="12"
              :aria-invalid="!!errors.warrantyMonths"
              :aria-describedby="errors.warrantyMonths ? 'f-warranty-error' : undefined"
            />
            <span class="field__unit" aria-hidden="true">개월</span>
            <button v-if="form.warrantyMonths !== ''" type="button" class="field__clear field__clear--inline" aria-label="보증 기간 지우기" @click="form.warrantyMonths = ''">✕</button>
          </div>
          <p v-if="errors.warrantyMonths" id="f-warranty-error" class="field__error" role="alert">{{ errors.warrantyMonths }}</p>
        </div>

      </section>

      <!-- ── 파일 첨부 ──────────────────────────────────────── -->
      <section class="form-section">
        <h2 class="form-section__heading">
          파일 첨부 <span class="form-section__optional">(선택)</span>
        </h2>

        <label class="file-picker">
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            class="file-picker__input"
            aria-label="파일 선택 (사진 또는 PDF)"
            @change="onFilesSelected"
          />
          <span class="file-picker__label">＋ 파일 선택 (사진 / PDF)</span>
        </label>

        <ul v-if="pendingFiles.length" class="file-list">
          <li v-for="(pf, idx) in pendingFiles" :key="pf.id" class="file-item">
            <div class="file-item__meta">
              <span class="file-item__name">{{ pf.file.name }}</span>
              <span class="file-item__size">{{ formatSize(pf.file.size) }}</span>
            </div>
            <div class="file-item__controls">
              <select
                v-model="pf.docType"
                class="file-item__kind"
                :aria-label="pf.file.name + ' 파일 종류 선택'"
              >
                <option value="receipt">영수증</option>
                <option value="manual">제품 설명서</option>
                <option value="warranty">보증서</option>
              </select>
              <!-- OCR 추출 버튼: 이미지 영수증 파일이고 실행 중이 아닐 때만 표시 -->
              <button
                v-if="pf.file.type.startsWith('image/') && pf.docType === 'receipt' && pf.ocrState !== 'running'"
                type="button"
                class="file-item__ocr-btn"
                :aria-label="(pf.ocrState === 'error' ? '영수증 정보 다시 읽어오기' : '영수증 정보 읽어오기') + ' — ' + pf.file.name"
                @click="runOcr(pf)"
              >{{ pf.ocrState === 'error' ? '다시 읽어오기' : '영수증 정보 읽어오기' }}</button>
              <button type="button" class="file-item__remove" aria-label="파일 제거" @click="removeFile(idx)">
                ✕
              </button>
            </div>

            <!-- OCR 진행 중 -->
            <div v-if="pf.ocrState === 'running'" class="ocr-panel ocr-panel--loading">
              <div class="ocr-progress-bar">
                <div class="ocr-progress-bar__fill" :style="{ width: pf.ocrProgress + '%' }"></div>
              </div>
              <p class="ocr-panel__status">{{ pf.ocrStatus || 'OCR 준비 중…' }} {{ pf.ocrProgress }}%</p>
              <p class="ocr-panel__note">처음 실행 시 언어 데이터를 다운로드하므로 시간이 걸릴 수 있습니다.</p>
            </div>

            <!-- OCR 오류 -->
            <p v-if="pf.ocrState === 'error'" class="ocr-error" role="alert">{{ pf.ocrError }}</p>

            <!-- OCR 결과: 후보 제시 -->
            <div v-if="pf.ocrState === 'done' && pf.ocrResult" class="ocr-panel ocr-panel--result">
              <p class="ocr-panel__title">추출 결과 — 적용할 항목을 선택하세요</p>

              <div v-if="pf.ocrResult.merchant" class="ocr-candidate">
                <div class="ocr-candidate__body">
                  <span class="ocr-candidate__label">상호</span>
                  <span class="ocr-candidate__value">{{ pf.ocrResult.merchant.value }}</span>
                  <span class="ocr-candidate__conf">{{ confidencePct(pf.ocrResult.merchant.confidence) }}</span>
                </div>
                <button type="button" class="ocr-apply-btn" @click="applyMerchant(pf)">구매처에 적용</button>
              </div>

              <div v-if="pf.ocrResult.date" class="ocr-candidate">
                <div class="ocr-candidate__body">
                  <span class="ocr-candidate__label">날짜</span>
                  <span class="ocr-candidate__value">{{ pf.ocrResult.date.value }}</span>
                  <span class="ocr-candidate__conf">{{ confidencePct(pf.ocrResult.date.confidence) }}</span>
                </div>
                <button type="button" class="ocr-apply-btn" @click="applyDate(pf)">구매일에 적용</button>
              </div>

              <div v-if="pf.ocrResult.amount" class="ocr-candidate">
                <div class="ocr-candidate__body">
                  <span class="ocr-candidate__label">금액</span>
                  <span class="ocr-candidate__value">{{ pf.ocrResult.amount.value }}</span>
                  <span class="ocr-candidate__conf">{{ confidencePct(pf.ocrResult.amount.confidence) }}</span>
                </div>
                <button type="button" class="ocr-apply-btn" @click="applyAmount(pf)">금액에 적용</button>
              </div>

              <p
                v-if="!pf.ocrResult.merchant && !pf.ocrResult.date && !pf.ocrResult.amount"
                class="ocr-panel__empty"
              >텍스트를 인식했지만 상호·날짜·금액을 찾지 못했습니다. 직접 입력해 주세요.</p>
            </div>

          </li>
        </ul>
      </section>

      <!-- ── 제출 오류 메시지 ─────────────────────────────────── -->
      <p v-if="errors.submit" class="submit-error" role="alert">{{ errors.submit }}</p>

      <!-- ── 저장 버튼 ──────────────────────────────────────── -->
      <div class="form-footer">
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ submitting ? '저장 중…' : '저장하기' }}
        </button>
      </div>

    </form>
  </div>
</template>

<script setup lang="ts">
useHead({ title: '추가 · SSOK' })
import type { Item, Attachment, ItemDocType, AttachmentDocType } from '~~/shared/types/ssok'
import type { OcrResult, OcrProgress } from '~/composables/useOcr.client'

// ── composables ───────────────────────────────────────────────────────────────

const router = useRouter()
const { saveItem, loadItems, getTopics } = useItems()
const { saveAttachment } = useAttachments()
const { saveExtract } = useReceiptExtracts()
const { recognize } = useOcr()
const { allSpaceChips, addCustomSpace } = useCustomSpaces()
const { allTopicChips: baseTopicChips, addCustomTopic } = useCustomTopics()

// IndexedDB의 기존 topic도 칩 목록에 포함 (spaces와 동일한 소스)
onMounted(() => loadItems())
const allTopicChips = computed<string[]>(() => {
  const seen = new Set(baseTopicChips.value)
  const extra = getTopics().filter(t => !seen.has(t))
  return [...baseTopicChips.value, ...extra]
})

// ── template refs (for focus management) ──────────────────────────────────────

const titleInput = ref<HTMLInputElement | null>(null)
const dateInput = ref<HTMLInputElement | null>(null)
const typeSelectorRef = ref<HTMLElement | null>(null)

// ── 상수 ──────────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: ItemDocType; label: string }[] = [
  { value: 'receipt', label: '영수증' },
  { value: 'warranty', label: '보증서' },
  { value: 'manual', label: '설명서' },
]

// ── form state ────────────────────────────────────────────────────────────────

const form = reactive({
  type: 'receipt' as ItemDocType,
  title: '',
  purchaseDate: todayIso(),
  store: '',
  warrantyMonths: 12 as number | '',
  price: undefined as number | undefined,
})

// 공간: 칩 선택 또는 직접 입력, 직접 입력이 우선
const spaceChip = ref('')
const spaceCustom = ref('')
const formSpace = computed(() => spaceCustom.value.trim() || spaceChip.value)
// ChipRow v-model — 직접 입력이 있으면 칩 선택 해제, 칩 선택 시 직접 입력 초기화
const spaceChipComputed = computed({
  get: () => spaceCustom.value.trim() ? '' : spaceChip.value,
  set: (val: string) => { spaceChip.value = val; spaceCustom.value = '' },
})

// 제품: 칩 선택 또는 직접 입력, 직접 입력이 우선
const topicChip = ref('')
const topicCustom = ref('')
const formTopic = computed(() => topicCustom.value.trim() || topicChip.value)
const topicChipComputed = computed({
  get: () => topicCustom.value.trim() ? '' : topicChip.value,
  set: (val: string) => { topicChip.value = val; topicCustom.value = '' },
})

interface PendingFile {
  id: string           // pre-generated; used as Attachment.id and ReceiptExtract.attachmentId
  file: File
  docType: AttachmentDocType  // document purpose (receipt | warranty | manual)
  ocrState: 'idle' | 'running' | 'done' | 'error'
  ocrProgress: number  // 0–100
  ocrStatus: string
  ocrResult: OcrResult | null
  ocrError: string | null
}

const pendingFiles = ref<PendingFile[]>([])
const errors = reactive<Record<string, string>>({})
const submitting = ref(false)

// ── helpers ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

function clampPurchaseDate(): void {
  if (!form.purchaseDate) return
  const year = new Date(form.purchaseDate).getFullYear()
  const today = todayIso()
  if (year > new Date().getFullYear()) {
    form.purchaseDate = today
  } else if (year < 1900) {
    form.purchaseDate = '1900-01-01'
  }
}

function warrantyEndDate(purchaseDate: string, months: number): string {
  const d = new Date(purchaseDate)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0] ?? ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// ── 종류 선택 ──────────────────────────────────────────────────────────────────

function selectType(t: ItemDocType): void {
  form.type = t
  // 파일 docType을 새 종류에 맞게 동기화
  for (const pf of pendingFiles.value) {
    pf.docType = t as AttachmentDocType
  }
  // 종류 변경 시 type-selector가 상단에서 24px 아래에 오도록 스크롤
  nextTick(() => {
    const el = typeSelectorRef.value
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - el.scrollHeight - 24
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }
  })
}

// ── 구매 금액 포맷 (천 단위 구분자) ─────────────────────────────────────────────

const { priceDisplay, onPriceInput, clearPrice, setPrice } = usePriceInput(toRef(form, 'price'))

// ── file input ────────────────────────────────────────────────────────────────

function onFilesSelected(e: Event): void {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  for (const file of Array.from(input.files)) {
    pendingFiles.value.push({
      id: crypto.randomUUID(),
      file,
      docType: form.type as AttachmentDocType,
      ocrState: 'idle',
      ocrProgress: 0,
      ocrStatus: '',
      ocrResult: null,
      ocrError: null,
    })
  }
  input.value = '' // allow re-selecting the same file
}

function removeFile(idx: number): void {
  pendingFiles.value.splice(idx, 1)
}

// ── OCR ───────────────────────────────────────────────────────────────────────

async function runOcr(pf: PendingFile): Promise<void> {
  if (!import.meta.client) return
  if (!pf.file.type.startsWith('image/')) return

  pf.ocrState = 'running'
  pf.ocrProgress = 0
  pf.ocrError = null
  pf.ocrResult = null

  try {
    pf.ocrResult = await recognize(pf.file, (p: OcrProgress) => {
      pf.ocrProgress = p.percent
      pf.ocrStatus = p.status
    })
    pf.ocrState = 'done'
  } catch (err) {
    console.error('[OCR] 실패:', err)
    pf.ocrState = 'error'
    pf.ocrError = 'OCR 처리 중 오류가 발생했습니다. 다시 시도하거나 직접 입력해 주세요.'
  }
}

function applyMerchant(pf: PendingFile): void {
  if (pf.ocrResult?.merchant) form.store = pf.ocrResult.merchant.value
}

function applyDate(pf: PendingFile): void {
  if (pf.ocrResult?.date) form.purchaseDate = pf.ocrResult.date.value
}

function applyAmount(pf: PendingFile): void {
  if (pf.ocrResult?.amount) {
    const n = parseInt(pf.ocrResult.amount.value.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(n)) setPrice(n)
  }
}

function confidencePct(c: number): string {
  return Math.round(c * 100) + '%'
}

// ── validation ────────────────────────────────────────────────────────────────

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]

  if (!form.title.trim())
    errors.title = '제품명을 입력해 주세요.'

  // 날짜 범위 검사 (입력된 경우에만)
  if (form.purchaseDate) {
    const year = new Date(form.purchaseDate).getFullYear()
    const thisYear = new Date().getFullYear()
    if (year < 1900 || year > thisYear)
      errors.purchaseDate = `구매일은 1900년부터 ${thisYear}년 사이로 입력해 주세요.`
  }

  // 보증 기간 범위 검사 (보증서 & 입력된 경우에만)
  if (
    form.type === 'warranty' &&
    form.warrantyMonths !== '' &&
    typeof form.warrantyMonths === 'number' &&
    form.warrantyMonths < 0
  ) {
    errors.warrantyMonths = '보증 기간은 0개월 이상이어야 합니다.'
  }

  return Object.keys(errors).length === 0
}

// ── submit ────────────────────────────────────────────────────────────────────

async function submit(): Promise<void> {
  if (!validate()) return

  submitting.value = true
  try {
    const id = crypto.randomUUID()
    const attachmentIds = pendingFiles.value.map(pf => pf.id)

    const item: Item = {
      id,
      title: form.title.trim(),
      type: form.type,
      attachmentIds,
      ...(formTopic.value && { topic: formTopic.value }),
      ...(formSpace.value && { space: formSpace.value }),
      ...(form.purchaseDate && { purchaseDate: form.purchaseDate }),
      ...(form.store.trim() && { store: form.store.trim() }),
      ...(form.type === 'warranty' &&
        form.warrantyMonths !== '' &&
        typeof form.warrantyMonths === 'number' &&
        form.purchaseDate && {
          warrantyUntil: warrantyEndDate(form.purchaseDate, form.warrantyMonths),
        }),
      ...(form.price != null && form.price > 0 && { price: form.price }),
    }

    await saveItem(item)

    // 직접 입력한 공간/제품이 있으면 다음 방문 시 칩으로 표시되도록 저장
    if (spaceCustom.value.trim()) addCustomSpace(spaceCustom.value.trim())
    if (topicCustom.value.trim()) addCustomTopic(topicCustom.value.trim())

    for (const pf of pendingFiles.value) {
      const attachment: Attachment = {
        id: pf.id,
        itemId: id,
        kind: pf.file.type.startsWith('image/') ? 'image' : 'pdf',
        type: pf.docType,
        mime: pf.file.type,
        blob: pf.file,
        createdAt: new Date().toISOString(),
      }
      await saveAttachment(attachment)

      // OCR 결과가 있으면 receiptExtracts에 저장
      // Vue ref 내부 객체는 Proxy이므로 spread로 plain object 변환 후 저장
      if (pf.ocrResult) {
        await saveExtract({
          attachmentId: pf.id,
          rawText: pf.ocrResult.rawText,
          merchant: pf.ocrResult.merchant ? { ...pf.ocrResult.merchant } : undefined,
          date: pf.ocrResult.date ? { ...pf.ocrResult.date } : undefined,
          amount: pf.ocrResult.amount ? { ...pf.ocrResult.amount } : undefined,
        })
      }
    }

    await router.push('/')
  } catch (err) {
    console.error('[add] 저장 오류:', err)
    errors.submit = '저장 중 오류가 발생했습니다. 다시 시도해 주세요.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.add-page {
  padding-bottom: var(--space-7);
}

// ── 종류 선택 칩 ──────────────────────────────────────────────────────────────

.type-selector {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.type-chip {
  flex: 1;
  padding: var(--space-3) var(--space-2);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.9375rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--color-sub);
  background: var(--color-surface);
  cursor: pointer;
  text-align: center;
  transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);

  // 종류별 기본 색조 (비활성)
  &--receipt  { --chip-color: #0369A1; --chip-bg: #E0F2FE; }
  &--warranty { --chip-color: #2F9E44; --chip-bg: #EBFBEE; }
  &--manual   { --chip-color: #7950F2; --chip-bg: #F3F0FF; }

  &--active {
    border-color: var(--chip-color);
    color: var(--chip-color);
    background: var(--chip-bg);
  }

  &:focus-visible {
    outline: 2px solid var(--chip-color, var(--color-primary));
    outline-offset: 2px;
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

    // input-row 안에서 절대 위치 없이 인라인으로
    &--inline {
      position: static;
      transform: none;
      flex-shrink: 0;
    }
  }

  &__hint {
    margin-top: calc(-1 * var(--space-1));
    margin-bottom: var(--space-2);
    font-size: 0.8125rem;
    color: var(--color-sub);
  }

  &__error {
    margin-top: var(--space-1);
    font-size: 0.8125rem;
    color: #E03131;
  }

  &--error .field__input {
    border-color: #E03131;
  }

  // 공간 필드: 설명서일 때 강조
  &--space-featured {
    .field__label {
      font-size: 1rem;
      color: var(--color-primary);
    }
  }
}

.required {
  color: var(--color-primary);
  margin-left: 2px;
}


.space-custom-input {
  margin-top: var(--space-2);
}

.topic-custom-input {
  margin-top: var(--space-2);
}

// ── file picker ───────────────────────────────────────────────────────────────

.file-picker {
  display: flex;
  justify-content: center;
  padding: var(--space-4) var(--space-5);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast);

  &:hover { border-color: var(--color-primary); }

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.18);
    outline: none;
  }

  &__input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  &__label {
    font-size: 0.9375rem;
    color: var(--color-sub);
    pointer-events: none;
  }
}

// ── file list ─────────────────────────────────────────────────────────────────

.file-list {
  margin-top: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
  }

  &__meta {
    flex: 1;
    min-width: 0;
  }

  &__name {
    display: block;
    font-size: 0.875rem;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__size {
    display: block;
    font-size: 0.75rem;
    color: var(--color-sub);
    margin-top: 2px;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  &__kind {
    padding: var(--space-1) calc(var(--space-2) + 20px) var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.8125rem;
    font-family: inherit;
    color: var(--color-text);
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5l5 5 5-5' stroke='%23868E96' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
      no-repeat right var(--space-2) center,
      var(--color-surface);
    cursor: pointer;
    appearance: none;

    &:focus-visible {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.18);
    }
  }

  &__remove {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    color: var(--color-sub);
    transition: color var(--transition-fast), background var(--transition-fast);

    &:hover {
      color: #E03131;
      background: #FFF0F0;
    }
  }
}

// ── OCR 추출 버튼 ─────────────────────────────────────────────────────────────

.file-item__ocr-btn {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
  transition: background var(--transition-fast);
  white-space: nowrap;

  &:hover { background: rgba(255, 107, 0, 0.07); }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.25);
  }
}

// ── OCR 패널 ──────────────────────────────────────────────────────────────────

.ocr-panel {
  margin-top: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;

  &--loading {
    background: #F8F9FA;
    border: 1px solid var(--color-border);
  }

  &--result {
    background: #F0F9FF;
    border: 1px solid #BAE6FD;
  }

  &__title {
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-3);
  }

  &__status {
    font-size: 0.8125rem;
    color: var(--color-sub);
    margin-top: var(--space-2);
    text-align: center;
  }

  &__note {
    font-size: 0.75rem;
    color: var(--color-sub);
    margin-top: var(--space-1);
    text-align: center;
  }

  &__empty {
    color: var(--color-sub);
    font-size: 0.8125rem;
  }
}

.ocr-progress-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;

  &__fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: var(--radius-full);
    transition: width 0.2s ease;
  }
}

.ocr-error {
  margin-top: var(--space-2);
  font-size: 0.8125rem;
  color: #C92A2A;
  background: #FFF5F5;
  border: 1px solid #FFC9C9;
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}

// ── OCR 후보 ──────────────────────────────────────────────────────────────────

.ocr-candidate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid #BAE6FD;

  &:last-of-type { border-bottom: none; }

  &__body {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
  }

  &__label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #0369A1;
    flex-shrink: 0;
    min-width: 28px;
  }

  &__value {
    font-size: 0.875rem;
    color: var(--color-text);
    font-weight: 500;
    word-break: break-all;
  }

  &__conf {
    font-size: 0.6875rem;
    color: var(--color-sub);
    flex-shrink: 0;
  }
}

.ocr-apply-btn {
  flex-shrink: 0;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast), color var(--transition-fast);

  &:hover {
    background: var(--color-primary);
    color: var(--color-btn-text);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.25);
  }
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
