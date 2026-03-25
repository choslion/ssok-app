<template>
  <div class="detail-page">

    <!-- 로딩 -->
    <div v-if="loading" class="detail-loading" aria-live="polite">
      불러오는 중…
    </div>

    <!-- 항목 없음 -->
    <div v-else-if="!item" class="detail-not-found">
      <p>항목을 찾을 수 없습니다.</p>
      <PageHeader :back="goBack" />
    </div>

    <!-- 본문 -->
    <template v-else>

      <!-- 내비 -->
      <PageHeader :back="goBack">
        <template #actions>
          <NuxtLink :to="'/item/' + itemId + '/edit'" class="action-btn action-btn--edit" aria-label="항목 수정">수정</NuxtLink>
          <template v-if="!deleteConfirm">
            <button type="button" class="action-btn action-btn--delete" aria-label="항목 삭제" @click="deleteConfirm = true">삭제</button>
          </template>
          <template v-else>
            <button type="button" class="action-btn action-btn--cancel" @click="deleteConfirm = false">취소</button>
            <button type="button" class="action-btn action-btn--confirm" :disabled="deleting" @click="deleteItemAndRedirect">
              {{ deleting ? '삭제 중…' : '정말 삭제' }}
            </button>
          </template>
        </template>
      </PageHeader>

      <!-- 메타데이터 카드 -->
      <section class="meta-card">
        <div class="meta-card__header">
          <h1 class="meta-card__name">{{ item.title }}</h1>
          <span class="category-badge">{{ TYPE_LABELS[availableTabs.length > 1 ? activeTypeTab : item.type] }}</span>
        </div>

        <dl class="meta-list">
          <div class="meta-list__row">
            <dt>구매처</dt>
            <dd>{{ item.store }}</dd>
          </div>
          <div class="meta-list__row">
            <dt>구매일</dt>
            <dd>{{ formatDate(item.purchaseDate) }}</dd>
          </div>
          <div class="meta-list__row">
            <dt>보증 만료</dt>
            <dd>
              <span class="warranty-badge" :class="'warranty-badge--' + warranty.type">
                {{ warranty.label }}
              </span>
            </dd>
          </div>
          <div v-if="item.price" class="meta-list__row">
            <dt>구매 금액</dt>
            <dd>{{ formatAmount(item.price) }}</dd>
          </div>
        </dl>
      </section>

      <!-- 첨부 파일 섹션 -->
      <section class="attachments">
        <h2 class="attachments__heading">
          <template v-if="availableTabs.length <= 1 && isManualPageSet">{{ activeTypeTab === 'warranty' ? '보증서' : '설명서' }} ({{ activeTabSwiperSlides.length }}페이지)</template>
          <template v-else>첨부 파일</template>
        </h2>

        <!-- 탭 (멀티타입 아이템일 때만) -->
        <div v-if="availableTabs.length > 1" ref="tabsEl" role="tablist" class="att-tabs" aria-label="문서 종류 선택">
          <button
            v-for="tab in availableTabs"
            :key="tab"
            type="button"
            role="tab"
            :aria-selected="activeTypeTab === tab"
            :class="['att-tab', { 'att-tab--active': activeTypeTab === tab }]"
            @click="activeTypeTab = tab"
          >{{ TYPE_LABELS[tab] }}<span class="att-tab__count">{{ typeGroups[tab]!.length }}</span></button>
          <div class="att-tabs__indicator" :style="indicatorStyle" aria-hidden="true"></div>
        </div>

        <p v-if="!attachments.length" class="attachments__empty">
          첨부된 파일이 없습니다.
        </p>

        <!-- ── 첨부 파일 슬라이더 ─────────────────────────────── -->
        <template v-else>
          <AttachmentSwiper
            v-model="activeCurrentPage"
            :slides="activeTabSwiperSlides"
            :aria-label="isManualPageSet
              ? (activeTypeTab === 'warranty' ? '보증서 페이지 뷰어' : '설명서 페이지 뷰어')
              : '첨부 파일 뷰어'"
          >
            <template #controls="{ slide, active }">
              <template v-if="active && slide.kind === 'image'">
                <button
                  type="button"
                  class="viewer__ctrl-btn"
                  :disabled="imageToolsBusy"
                  aria-label="이미지 자르기"
                  @click="openCrop(attachmentById(slide.id)!, $event.currentTarget as HTMLButtonElement)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <polyline points="6 2 6 16 20 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="2 6 16 6 16 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button
                  type="button"
                  class="viewer__ctrl-btn"
                  :class="{ 'viewer__ctrl-btn--spinning': rotating === slide.id }"
                  :disabled="imageToolsBusy"
                  aria-label="이미지 시계 방향으로 90° 회전"
                  @click="rotateImage(attachmentById(slide.id)!)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <polyline points="23 4 23 10 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </template>
            </template>
          </AttachmentSwiper>

          <!-- 페이지 추가 버튼 (설명서·보증서 세트만) -->
          <label
            v-if="isManualPageSet"
            class="append-pages-label"
            :class="{ 'append-pages-label--loading': appendingPages }"
          >
            <input
              type="file"
              accept="image/*"
              multiple
              class="sr-only"
              :disabled="appendingPages"
              @change="appendPages"
            />
            <span>{{ appendingPages ? '추가 중…' : '+ 페이지 추가' }}</span>
          </label>
        </template>
      </section>

    </template>
  </div>

  <!-- 크롭 모달 (body에 텔레포트) -->
  <Teleport to="body">
    <div
      v-if="cropSession"
      class="crop-modal"
      role="dialog"
      aria-modal="true"
      aria-label="이미지 자르기"
      @keydown.escape="cancelCrop"
    >
      <!-- 헤더 -->
      <div class="crop-modal__header">
        <span class="crop-modal__title">이미지 자르기</span>
        <button
          type="button"
          class="crop-modal__close"
          aria-label="자르기 취소"
          @click="cancelCrop"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>

      <!-- 캔버스 영역 -->
      <div class="crop-modal__canvas-area">
        <div
          ref="cropArea"
          class="crop-img-wrap"
          @pointermove="onCropPointerMove"
          @pointerup="onCropPointerUp"
          @pointercancel="onCropPointerUp"
        >
          <img
            ref="cropImg"
            :src="objectUrls.get(cropSession.att.id)"
            :alt="TYPE_LABELS[cropSession.att.type] + ' 이미지 (자르기)'"
            class="crop-img"
            draggable="false"
            @load="onCropImgLoad"
          />
          <!-- 크롭 셀렉션 (이미지 로드 후 표시) -->
          <div
            v-if="cropSession.displayW > 0"
            class="crop-selection"
            :style="{
              left:   cropRect.x1 + 'px',
              top:    cropRect.y1 + 'px',
              width:  (cropRect.x2 - cropRect.x1) + 'px',
              height: (cropRect.y2 - cropRect.y1) + 'px',
            }"
          >
            <!-- 이동 영역 -->
            <div
              class="crop-handle crop-handle--move"
              tabindex="0"
              role="slider"
              aria-label="자르기 영역 이동 (화살표 키로 조절)"
              @pointerdown="onHandlePointerDown($event, 'move')"
              @keydown="onHandleKeydown($event, 'move')"
            />
            <!-- 모서리 핸들 -->
            <div class="crop-handle crop-handle--tl" tabindex="0" role="slider" aria-label="왼쪽 위 모서리 (화살표 키로 조절)" @pointerdown="onHandlePointerDown($event, 'tl')" @keydown="onHandleKeydown($event, 'tl')" />
            <div class="crop-handle crop-handle--tr" tabindex="0" role="slider" aria-label="오른쪽 위 모서리 (화살표 키로 조절)" @pointerdown="onHandlePointerDown($event, 'tr')" @keydown="onHandleKeydown($event, 'tr')" />
            <div class="crop-handle crop-handle--bl" tabindex="0" role="slider" aria-label="왼쪽 아래 모서리 (화살표 키로 조절)" @pointerdown="onHandlePointerDown($event, 'bl')" @keydown="onHandleKeydown($event, 'bl')" />
            <div class="crop-handle crop-handle--br" tabindex="0" role="slider" aria-label="오른쪽 아래 모서리 (화살표 키로 조절)" @pointerdown="onHandlePointerDown($event, 'br')" @keydown="onHandleKeydown($event, 'br')" />
            <!-- 가장자리 핸들 -->
            <div class="crop-handle crop-handle--t" tabindex="0" role="slider" aria-label="위쪽 가장자리 (화살표 키로 조절)" @pointerdown="onHandlePointerDown($event, 't')" @keydown="onHandleKeydown($event, 't')" />
            <div class="crop-handle crop-handle--b" tabindex="0" role="slider" aria-label="아래쪽 가장자리 (화살표 키로 조절)" @pointerdown="onHandlePointerDown($event, 'b')" @keydown="onHandleKeydown($event, 'b')" />
            <div class="crop-handle crop-handle--l" tabindex="0" role="slider" aria-label="왼쪽 가장자리 (화살표 키로 조절)" @pointerdown="onHandlePointerDown($event, 'l')" @keydown="onHandleKeydown($event, 'l')" />
            <div class="crop-handle crop-handle--r" tabindex="0" role="slider" aria-label="오른쪽 가장자리 (화살표 키로 조절)" @pointerdown="onHandlePointerDown($event, 'r')" @keydown="onHandleKeydown($event, 'r')" />
          </div>
        </div>
      </div>

      <!-- 푸터 -->
      <div class="crop-modal__footer">
        <button
          type="button"
          class="crop-modal__cancel-btn"
          @click="cancelCrop"
        >취소</button>
        <button
          type="button"
          class="crop-modal__apply-btn"
          :disabled="applying || cropSession.displayW === 0"
          @click="applyCrop"
        >{{ applying ? '적용 중…' : '자르기 적용' }}</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Item, Attachment, AttachmentDocType } from '~~/shared/types/ssok'
import { formatDate, formatAmount } from '~~/shared/utils/format'
import { compressImage } from '~/utils/compressImage.client'

// ── 라우트 파라미터 ───────────────────────────────────────────────────────────

const route = useRoute()
const router = useRouter()
const itemId = computed(() => route.params.id as string)

// ── 뒤로 가기 ─────────────────────────────────────────────────────────────────

function goBack(): void {
  const from  = route.query.from as string | undefined
  const space = route.query.space as string | undefined
  if (from === 'spaces') {
    router.push(space ? { path: '/spaces', query: { space } } : '/spaces')
  } else if (from === 'expiring') {
    router.push('/expiring')
  } else {
    router.push('/')
  }
}

// ── composables ───────────────────────────────────────────────────────────────

const { getItem, deleteItem, updateItem } = useItems()
const { attachments, loadAttachmentsByItemId, clearAttachments, deleteAttachment, saveAttachment } = useAttachments()
const { deleteExtract } = useReceiptExtracts()

// ── 상태 ──────────────────────────────────────────────────────────────────────

const loading = ref(true)
const item = ref<Item | null>(null)
const deleteConfirm = ref(false)
const deleting = ref(false)

// attachmentId → object URL (reactive: template binding용)
const objectUrls = ref(new Map<string, string>())

// 생성된 URL 원본 보관 (non-reactive: unmount 시 revoke용)
const createdUrls = new Map<string, string>()

// 현재 회전 중인 첨부 파일 ID (null = 없음)
const rotating = ref<string | null>(null)

// ── 크롭 상태 ─────────────────────────────────────────────────────────────────

interface CropRect { x1: number; y1: number; x2: number; y2: number }
interface CropDrag { handle: string; startX: number; startY: number; startRect: CropRect }
interface CropSession {
  att: Attachment
  naturalW: number
  naturalH: number
  displayW: number  // onCropImgLoad 이후 설정
  displayH: number
}

const cropSession   = ref<CropSession | null>(null)
const cropRect      = ref<CropRect>({ x1: 0, y1: 0, x2: 0, y2: 0 })
const cropDrag      = ref<CropDrag | null>(null)
const applying      = ref(false)
const cropTriggerBtn = ref<HTMLButtonElement | null>(null)

const cropImgRef  = useTemplateRef<HTMLImageElement>('cropImg')
const cropAreaRef = useTemplateRef<HTMLDivElement>('cropArea')

// 이미지 도구가 사용 중이면 true (회전/크롭 버튼 비활성화)
const imageToolsBusy = computed(() =>
  rotating.value !== null || cropSession.value !== null || applying.value,
)

// ── 첨부 파일 뷰어 ───────────────────────────────────────────────────────────

// attachmentIds 순서대로 정렬한 첨부 파일 목록
const orderedAttachments = computed(() => {
  if (!item.value) return attachments.value
  const order = item.value.attachmentIds
  return [...attachments.value].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
})

// 탭 표시 순서
const TAB_ORDER: AttachmentDocType[] = ['receipt', 'warranty', 'manual']

// 타입별 첨부 파일 그룹
const typeGroups = computed(() => {
  const groups: Partial<Record<AttachmentDocType, Attachment[]>> = {}
  for (const att of orderedAttachments.value) {
    if (!groups[att.type]) groups[att.type] = []
    groups[att.type]!.push(att)
  }
  return groups
})

// 첨부 파일이 있는 타입 목록 (탭 표시용)
const availableTabs = computed<AttachmentDocType[]>(() =>
  TAB_ORDER.filter(t => (typeGroups.value[t]?.length ?? 0) > 0),
)

// 현재 활성 탭
const activeTypeTab = ref<AttachmentDocType>('receipt')

// 탭 인디케이터
const tabsEl = useTemplateRef<HTMLDivElement>('tabsEl')
const indicatorStyle = ref({ left: '0px', width: '0px' })

// 아이템 로드 후 첫 번째 탭으로 초기화
watch(availableTabs, tabs => {
  if (tabs.length > 0 && !tabs.includes(activeTypeTab.value)) {
    activeTypeTab.value = tabs[0]!
  }
}, { immediate: true })

// DOM 업데이트 완료 후 인디케이터 위치 동기화
// activeTypeTab·availableTabs 어느 쪽이 바뀌어도 자동 추적
watchEffect(() => {
  void availableTabs.value
  void activeTypeTab.value
  if (!tabsEl.value) return
  const activeBtn = tabsEl.value.querySelector<HTMLButtonElement>('.att-tab--active')
  if (!activeBtn) return
  indicatorStyle.value = { left: activeBtn.offsetLeft + 'px', width: activeBtn.offsetWidth + 'px' }
}, { flush: 'post' })

// 탭별 페이지 인덱스
const tabCurrentPages = ref<Partial<Record<AttachmentDocType, number>>>({})

const activeCurrentPage = computed({
  get: () => tabCurrentPages.value[activeTypeTab.value] ?? 0,
  set: (v: number) => {
    tabCurrentPages.value = { ...tabCurrentPages.value, [activeTypeTab.value]: v }
  },
})

// 현재 탭의 슬라이드 데이터
const activeTabSwiperSlides = computed(() =>
  (typeGroups.value[activeTypeTab.value] ?? []).map(att => ({
    id: att.id,
    url: objectUrls.value.get(att.id) ?? '',
    kind: att.kind,
    label: TYPE_LABELS[att.type] + (att.kind === 'image' ? ' 이미지' : ' PDF'),
  })),
)

// 현재 탭이 설명서/보증서이고 2개 이상이면 페이지 세트 모드
const isManualPageSet = computed(() =>
  (activeTypeTab.value === 'manual' || activeTypeTab.value === 'warranty') &&
  (typeGroups.value[activeTypeTab.value]?.length ?? 0) > 1,
)

function attachmentById(id: string): Attachment | undefined {
  return orderedAttachments.value.find(a => a.id === id)
}

// 설명서 페이지 추가: 이미지 파일을 선택해 기존 세트에 덧붙임
const appendingPages = ref(false)

async function appendPages(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length || !item.value) return

  appendingPages.value = true
  try {
    const newIds: string[] = []
    for (const file of files) {
      const compressed = await compressImage(file)
      const id = crypto.randomUUID()
      const att: Attachment = {
        id,
        itemId: item.value.id,
        kind: 'image',
        type: activeTypeTab.value,
        mime: compressed.type,
        blob: compressed,
        createdAt: new Date().toISOString(),
      }
      await saveAttachment(att)
      newIds.push(id)
      const url = URL.createObjectURL(compressed)
      objectUrls.value.set(id, url)
      createdUrls.set(id, url)
    }
    const updatedIds = [...item.value.attachmentIds, ...newIds]
    await updateItem(item.value.id, { attachmentIds: updatedIds })
    item.value = { ...item.value, attachmentIds: updatedIds }
    // 새로 추가된 첫 페이지로 이동 (활성 탭 기준 인덱스)
    activeCurrentPage.value = (typeGroups.value[activeTypeTab.value]?.length ?? 1) - newIds.length
  } finally {
    appendingPages.value = false
  }
}

// ── 로드 / 클리어 ─────────────────────────────────────────────────────────────

async function load(): Promise<void> {
  loading.value = true
  item.value = (await getItem(itemId.value)) ?? null
  if (item.value) {
    await loadAttachmentsByItemId(itemId.value)
    buildObjectUrls()
  }
  loading.value = false
}

function buildObjectUrls(): void {
  for (const att of attachments.value) {
    if (!objectUrls.value.has(att.id)) {
      const url = URL.createObjectURL(att.blob)
      objectUrls.value.set(att.id, url)
      createdUrls.set(att.id, url)
    }
  }
}

async function deleteItemAndRedirect(): Promise<void> {
  deleting.value = true
  try {
    for (const att of attachments.value) {
      await deleteExtract(att.id)
      await deleteAttachment(att.id)
    }
    revokeAllObjectUrls()
    clearAttachments()
    await deleteItem(itemId.value)
    await router.push('/')
  } catch (err) {
    console.error('[detail] 삭제 오류:', err)
    deleting.value = false
    deleteConfirm.value = false
  }
}

// ── 이미지 회전 ───────────────────────────────────────────────────────────────

/** 이미지를 시계 방향 90° 회전하여 IndexedDB에 덮어씁니다. */
async function rotateImage(att: Attachment): Promise<void> {
  if (rotating.value !== null) return
  rotating.value = att.id

  try {
    // 1. Blob → ImageBitmap 로드
    const bitmap = await createImageBitmap(att.blob)
    const srcW = bitmap.width
    const srcH = bitmap.height

    // 2. 90° CW 후 출력 크기 계산: w/h 교환 후 maxWidth=1200 적용
    let dstW = srcH
    let dstH = srcW
    if (dstW > 1200) {
      const ratio = 1200 / dstW
      dstW = 1200
      dstH = Math.round(dstH * ratio)
    }

    // 3. Canvas에 회전 그리기
    const canvas = document.createElement('canvas')
    canvas.width  = dstW
    canvas.height = dstH
    const ctx = canvas.getContext('2d')!
    ctx.translate(dstW, 0)
    ctx.rotate(Math.PI / 2)
    ctx.scale(dstW / srcH, dstH / srcW)
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    // 4. Canvas → Blob (GIF는 PNG로, JPEG는 품질 0.88)
    const outputMime = att.mime === 'image/gif' ? 'image/png'
      : att.mime === 'image/jpg' ? 'image/jpeg'
      : att.mime
    const rotatedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('캔버스 변환 실패')),
        outputMime,
        outputMime === 'image/jpeg' ? 0.88 : undefined,
      )
    })

    // 5. IndexedDB 덮어쓰기
    const updatedAtt: Attachment = { ...att, blob: rotatedBlob, mime: outputMime }
    await saveAttachment(updatedAtt)

    // 6. Object URL 교체
    const oldUrl = objectUrls.value.get(att.id)
    if (oldUrl) { URL.revokeObjectURL(oldUrl); createdUrls.delete(att.id) }
    const newUrl = URL.createObjectURL(rotatedBlob)
    objectUrls.value.set(att.id, newUrl)
    createdUrls.set(att.id, newUrl)

    // 7. 로컬 상태 업데이트
    const idx = attachments.value.findIndex(a => a.id === att.id)
    if (idx >= 0) attachments.value[idx] = updatedAtt
  } catch (err) {
    console.error('[rotate] 이미지 회전 오류:', err)
  } finally {
    rotating.value = null
  }
}

// ── 이미지 크롭 ───────────────────────────────────────────────────────────────

/** 크롭 모달을 엽니다. */
async function openCrop(att: Attachment, triggerEl: HTMLButtonElement): Promise<void> {
  if (cropSession.value) return
  cropTriggerBtn.value = triggerEl

  const bitmap = await createImageBitmap(att.blob)
  const nW = bitmap.width
  const nH = bitmap.height
  bitmap.close()

  cropSession.value = { att, naturalW: nW, naturalH: nH, displayW: 0, displayH: 0 }

  await nextTick()
  document.querySelector<HTMLElement>('.crop-modal__close')?.focus()
}

/** 크롭 이미지가 모달에서 로드된 후 표시 크기를 측정합니다. */
function onCropImgLoad(): void {
  if (!cropImgRef.value || !cropSession.value) return
  const { offsetWidth: dw, offsetHeight: dh } = cropImgRef.value
  if (!dw || !dh) return
  cropSession.value = { ...cropSession.value, displayW: dw, displayH: dh }
  cropRect.value = { x1: 0, y1: 0, x2: dw, y2: dh }
}

/** 크롭 모달을 닫고 트리거 버튼으로 포커스를 복원합니다. */
function cancelCrop(): void {
  const btn = cropTriggerBtn.value
  cropSession.value  = null
  cropDrag.value     = null
  applying.value     = false
  cropTriggerBtn.value = null
  nextTick(() => btn?.focus())
}

/** 선택 영역을 픽셀 단위로 잘라 IndexedDB에 저장합니다. */
async function applyCrop(): Promise<void> {
  const session = cropSession.value
  if (!session || applying.value || session.displayW === 0) return
  applying.value = true

  try {
    const { att, naturalW, naturalH, displayW, displayH } = session
    const { x1, y1, x2, y2 } = cropRect.value

    // 1. 표시 좌표 → 자연 좌표 변환
    const scaleX = naturalW / displayW
    const scaleY = naturalH / displayH
    const sx = Math.round(x1 * scaleX)
    const sy = Math.round(y1 * scaleY)
    const sw = Math.max(1, Math.round((x2 - x1) * scaleX))
    const sh = Math.max(1, Math.round((y2 - y1) * scaleY))

    // 2. createImageBitmap으로 픽셀 정확한 크롭
    const bitmap = await createImageBitmap(att.blob, sx, sy, sw, sh)

    // 3. maxWidth=1200 적용
    let outW = bitmap.width
    let outH = bitmap.height
    if (outW > 1200) {
      const ratio = 1200 / outW
      outW = 1200
      outH = Math.round(outH * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width  = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, outW, outH)
    bitmap.close()

    // 4. Canvas → Blob
    const outputMime = att.mime === 'image/gif' ? 'image/png'
      : att.mime === 'image/jpg' ? 'image/jpeg'
      : att.mime
    const croppedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('캔버스 변환 실패')),
        outputMime,
        outputMime === 'image/jpeg' ? 0.88 : undefined,
      )
    })

    // 5. IndexedDB 덮어쓰기
    const updatedAtt: Attachment = { ...att, blob: croppedBlob, mime: outputMime }
    await saveAttachment(updatedAtt)

    // 6. Object URL 교체
    const oldUrl = objectUrls.value.get(att.id)
    if (oldUrl) { URL.revokeObjectURL(oldUrl); createdUrls.delete(att.id) }
    const newUrl = URL.createObjectURL(croppedBlob)
    objectUrls.value.set(att.id, newUrl)
    createdUrls.set(att.id, newUrl)

    // 7. 로컬 상태 업데이트
    const idx = attachments.value.findIndex(a => a.id === att.id)
    if (idx >= 0) attachments.value[idx] = updatedAtt

    cancelCrop()
  } catch (err) {
    console.error('[crop] 이미지 크롭 오류:', err)
    applying.value = false
  }
}

// ── 크롭 핸들 포인터 이벤트 ───────────────────────────────────────────────────

function onHandlePointerDown(e: PointerEvent, handle: string): void {
  e.preventDefault()
  e.stopPropagation()
  cropAreaRef.value?.setPointerCapture(e.pointerId)
  cropDrag.value = {
    handle,
    startX:    e.clientX,
    startY:    e.clientY,
    startRect: { ...cropRect.value },
  }
}

function onCropPointerMove(e: PointerEvent): void {
  if (!cropDrag.value || !cropSession.value) return
  const { handle, startX, startY, startRect } = cropDrag.value
  const { displayW, displayH } = cropSession.value
  const MIN = 20

  const dx = e.clientX - startX
  const dy = e.clientY - startY
  let { x1, y1, x2, y2 } = startRect

  if (handle === 'move') {
    const w = x2 - x1
    const h = y2 - y1
    x1 = Math.max(0, Math.min(displayW - w, x1 + dx))
    y1 = Math.max(0, Math.min(displayH - h, y1 + dy))
    x2 = x1 + w
    y2 = y1 + h
  } else {
    if (handle === 'tl' || handle === 'l' || handle === 'bl')
      x1 = Math.max(0, Math.min(x2 - MIN, startRect.x1 + dx))
    if (handle === 'tr' || handle === 'r' || handle === 'br')
      x2 = Math.min(displayW, Math.max(x1 + MIN, startRect.x2 + dx))
    if (handle === 'tl' || handle === 't' || handle === 'tr')
      y1 = Math.max(0, Math.min(y2 - MIN, startRect.y1 + dy))
    if (handle === 'bl' || handle === 'b' || handle === 'br')
      y2 = Math.min(displayH, Math.max(y1 + MIN, startRect.y2 + dy))
  }

  cropRect.value = { x1, y1, x2, y2 }
}

function onCropPointerUp(): void {
  cropDrag.value = null
}

// ── 크롭 핸들 키보드 이벤트 ───────────────────────────────────────────────────

function onHandleKeydown(e: KeyboardEvent, handle: string): void {
  if (e.key === 'Escape') { cancelCrop(); return }

  let ddx = 0, ddy = 0
  const step = e.shiftKey ? 10 : 1
  if (e.key === 'ArrowLeft')  ddx = -step
  else if (e.key === 'ArrowRight') ddx = step
  else if (e.key === 'ArrowUp')    ddy = -step
  else if (e.key === 'ArrowDown')  ddy = step
  else return
  e.preventDefault()

  if (!cropSession.value) return
  const { displayW, displayH } = cropSession.value
  const MIN = 20
  let { x1, y1, x2, y2 } = cropRect.value

  if (handle === 'move') {
    const w = x2 - x1
    const h = y2 - y1
    x1 = Math.max(0, Math.min(displayW - w, x1 + ddx))
    y1 = Math.max(0, Math.min(displayH - h, y1 + ddy))
    x2 = x1 + w
    y2 = y1 + h
  } else {
    if (handle === 'tl' || handle === 'l' || handle === 'bl')
      x1 = Math.max(0, Math.min(x2 - MIN, x1 + ddx))
    if (handle === 'tr' || handle === 'r' || handle === 'br')
      x2 = Math.min(displayW, Math.max(x1 + MIN, x2 + ddx))
    if (handle === 'tl' || handle === 't' || handle === 'tr')
      y1 = Math.max(0, Math.min(y2 - MIN, y1 + ddy))
    if (handle === 'bl' || handle === 'b' || handle === 'br')
      y2 = Math.min(displayH, Math.max(y1 + MIN, y2 + ddy))
  }

  cropRect.value = { x1, y1, x2, y2 }
}

// ── Object URL 정리 ───────────────────────────────────────────────────────────

function revokeAllObjectUrls(): void {
  for (const url of createdUrls.values()) {
    URL.revokeObjectURL(url)
  }
  createdUrls.clear()
  objectUrls.value.clear()
}

// ── 생명주기 ──────────────────────────────────────────────────────────────────

onMounted(() => load())

onBeforeUnmount(() => {
  // iframe src를 먼저 제거해 네이티브 PDF 뷰어가 URL 참조를 놓게 함
  objectUrls.value.clear()
})

onUnmounted(() => {
  // DOM이 제거된 뒤 URL을 revoke (뒤로가기 오류 방지)
  for (const url of createdUrls.values()) {
    URL.revokeObjectURL(url)
  }
  createdUrls.clear()
  clearAttachments()
})

// ── 포맷 유틸 ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return formatDate(d.toISOString().split('T')[0] ?? '') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0')
}

// ── 보증 상태 ─────────────────────────────────────────────────────────────────

const warranty = computed(() => {
  if (!item.value) return { label: '', type: 'normal' as const }
  if (!item.value.warrantyUntil) return { label: '보증 정보 없음', type: 'expired' as const }
  const diffDays = Math.floor(
    (new Date(item.value.warrantyUntil).getTime() - Date.now()) / 86_400_000
  )
  if (diffDays < 0)   return { label: '보증 만료', type: 'expired' as const }
  if (diffDays <= 30) return { label: '만료 D-' + diffDays, type: 'soon' as const }
  return { label: formatDate(item.value.warrantyUntil) + '까지', type: 'normal' as const }
})

// ── 종류 라벨 ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AttachmentDocType, string> = {
  receipt:  '영수증',
  manual:   '제품 설명서',
  warranty: '보증서',
}
</script>

<style scoped lang="scss">
.detail-page {
  padding-top: var(--space-3);
  padding-bottom: var(--space-7);
}

// ── 로딩 / 오류 ───────────────────────────────────────────────────────────────

.detail-loading,
.detail-not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-7) var(--space-5);
  text-align: center;
  color: var(--color-sub);
  font-size: 0.9375rem;
}


.action-btn {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast);
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &--edit {
    color: var(--color-primary);
    border: 1.5px solid var(--color-primary);
    background: transparent;
    &:hover { background: rgba(255, 107, 0, 0.07); }
  }

  &--delete {
    color: #C92A2A;
    border: 1.5px solid #FFC9C9;
    background: transparent;
    &:hover { background: #FFF5F5; }
  }

  &--cancel {
    color: var(--color-sub);
    border: 1.5px solid var(--color-border);
    background: transparent;
    &:hover { background: var(--color-bg); }
  }

  &--confirm {
    color: #fff;
    border: 1.5px solid #C92A2A;
    background: #C92A2A;
    &:hover:not(:disabled) { background: #A61E1E; border-color: #A61E1E; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
}

// ── 메타 카드 ─────────────────────────────────────────────────────────────────

.meta-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  box-shadow: var(--shadow-card);
  margin-bottom: var(--space-4);

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  &__name {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.3;
  }
}

.category-badge {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(255, 107, 0, 0.1);
  padding: 3px var(--space-2);
  border-radius: var(--radius-full);
  white-space: nowrap;
  margin-top: 4px;
  transition: color var(--transition-fast), background var(--transition-fast);
}

// ── 메타 목록 ─────────────────────────────────────────────────────────────────

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 0;

  &__row {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    padding: var(--space-3) 0;
    border-top: 1px solid var(--color-border);

    dt {
      flex-shrink: 0;
      width: 72px;
      font-size: 0.8125rem;
      color: var(--color-sub);
    }

    dd {
      font-size: 0.9375rem;
      color: var(--color-text);
    }

  }
}

.warranty-badge {
  display: inline-block;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);

  &--normal  { color: #868E96; background: #F1F3F5; }
  &--soon    { color: #E8590C; background: #FFF4E6; }
  &--expired { color: #868E96; background: #F1F3F5; }
}

// ── 첨부 파일 섹션 ────────────────────────────────────────────────────────────

.attachments {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  box-shadow: var(--shadow-card);

  &__heading {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: var(--space-4);
  }

  &__empty {
    font-size: 0.875rem;
    color: var(--color-sub);
    text-align: center;
    padding: var(--space-4) 0;
  }
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.attachment-item {
  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  &__date {
    font-size: 0.75rem;
    color: var(--color-sub);
  }
}

.kind-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);

  &--receipt  { color: #1971C2; background: #E7F5FF; }
  &--manual   { color: #5C940D; background: #F4FCE3; }
  &--warranty { color: #862E9C; background: #F8F0FC; }
}

// ── 문서 종류 탭 ──────────────────────────────────────────────────────────────

.att-tabs {
  position: relative;
  display: flex;
  gap: 0;
  margin: 0 calc(-1 * var(--space-5)) var(--space-4);
  padding: 0 var(--space-5);
  border-bottom: 1.5px solid var(--color-border);
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }

  &__indicator {
    position: absolute;
    bottom: -1.5px;
    height: 2px;
    background: var(--color-primary);
    border-radius: 1px;
    pointer-events: none;
    z-index: 1;
    transition: left 0.22s cubic-bezier(0.4, 0, 0.2, 1), width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

.att-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-2) var(--space-3);
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--color-sub);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--transition-fast);

  &--active { color: var(--color-primary); }

  &:hover:not(.att-tab--active) { color: var(--color-text); }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }

  &__count {
    font-size: 0.625rem;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: var(--radius-full);
    background: var(--color-orange-tint);
    color: var(--color-orange-text);

    .att-tab--active & {
      background: var(--color-primary);
      color: #fff;
    }
  }
}

// ── 설명서 페이지 네비게이터 → AttachmentSwiper 컴포넌트로 이전 ───────────────

.append-pages-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: var(--space-3);
  padding: var(--space-3) var(--space-3);
  border: 1.5px dashed var(--color-orange-border);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-orange-text);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);

  &:hover:not(.append-pages-label--loading) {
    background: var(--color-orange-tint);
    border-color: var(--color-primary);
  }

  &--loading {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-within {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// ── 뷰어 컨트롤 버튼 (AttachmentSwiper #controls 슬롯에서 사용) ───────────────

.viewer {
  &__ctrl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    // 어떤 이미지 위에서도 아이콘이 잘 보이도록 반투명 다크 배경
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    cursor: pointer;
    transition: background var(--transition-fast);

    &:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.65);
    }

    &:disabled { opacity: 0.4; cursor: not-allowed; }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 3px;
    }

    &--spinning svg {
      animation: rotate-spin 0.7s linear infinite;
    }
  }

  @keyframes rotate-spin { to { transform: rotate(360deg); } }
}

// ── 크롭 모달 ─────────────────────────────────────────────────────────────────

.crop-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    flex-shrink: 0;
  }

  &__title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #fff;
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: #fff;
    cursor: pointer;
    transition: background var(--transition-fast);

    &:hover { background: rgba(255, 255, 255, 0.12); }
    &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  }

  &__canvas-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: var(--space-3);
    min-height: 0;
    user-select: none;
    touch-action: none;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    flex-shrink: 0;
  }

  &__cancel-btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.85);
    transition: background var(--transition-fast);

    &:hover { background: rgba(255, 255, 255, 0.2); }
    &:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
  }

  &__apply-btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    background: var(--color-primary);
    border: 1.5px solid var(--color-primary);
    color: var(--color-btn-text, #fff);
    transition: background var(--transition-fast), opacity var(--transition-fast);

    &:hover:not(:disabled) { background: #e05e00; border-color: #e05e00; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  }
}

// 이미지 래퍼 (크롭 오버레이 기준점)
.crop-img-wrap {
  position: relative;
  display: inline-block;
  line-height: 0;
  touch-action: none;
}

.crop-img {
  display: block;
  max-width: min(calc(100vw - 64px), 640px);
  max-height: calc(100vh - 180px);
  object-fit: contain;
  user-select: none;
  pointer-events: none;
  border-radius: 2px;
}

// 크롭 선택 영역
.crop-selection {
  position: absolute;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
  border: 1.5px solid rgba(255, 255, 255, 0.85);
  z-index: 1;
}

// 크롭 핸들
.crop-handle {
  position: absolute;

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
    z-index: 2;
  }

  // 모서리 핸들
  &--tl, &--tr, &--bl, &--br {
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 2px;
  }
  &--tl { top: -6px; left: -6px; cursor: nwse-resize; }
  &--tr { top: -6px; right: -6px; cursor: nesw-resize; }
  &--bl { bottom: -6px; left: -6px; cursor: nesw-resize; }
  &--br { bottom: -6px; right: -6px; cursor: nwse-resize; }

  // 가장자리 핸들
  &--t, &--b {
    height: 6px;
    width: 32px;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 3px;
    left: 50%;
    transform: translateX(-50%);
  }
  &--t { top: -3px; cursor: ns-resize; }
  &--b { bottom: -3px; cursor: ns-resize; }

  &--l, &--r {
    width: 6px;
    height: 32px;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 3px;
    top: 50%;
    transform: translateY(-50%);
  }
  &--l { left: -3px; cursor: ew-resize; }
  &--r { right: -3px; cursor: ew-resize; }

  // 이동 영역
  &--move {
    position: absolute;
    inset: 8px;
    cursor: move;
    background: transparent;
  }
}
</style>
