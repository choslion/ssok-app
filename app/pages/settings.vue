<template>
  <div class="settings-page">
    <h1 class="settings-page__heading">설정</h1>

    <!-- 데이터 관리 -->
    <section class="settings-card" aria-labelledby="data-management-heading">
      <h2 id="data-management-heading" class="settings-card__heading">데이터 관리</h2>

      <!-- 마지막 백업 상태 -->
      <div class="backup-status" role="status" aria-live="polite" aria-label="마지막 백업 상태">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="backup-status__icon">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
          <path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="backup-status__label">마지막 백업</span>
        <span class="backup-status__value" :class="{ 'backup-status__value--none': !lastBackupAt }">
          {{ lastBackupLabel }}
        </span>
      </div>

      <div class="settings-card__actions">

        <!-- ── 내보내기 ────────────────────────────────────────────────────── -->
        <button
          type="button"
          class="settings-btn"
          :disabled="isExporting || isImporting"
          :aria-busy="isExporting"
          aria-describedby="export-desc"
          @click="exportBackup"
        >
          <template v-if="isExporting">
            <span class="settings-btn__spinner" aria-hidden="true"></span>
            <span class="settings-btn__text">{{ exportStep }}</span>
            <span class="settings-btn__pct" aria-hidden="true">{{ exportProgress }}%</span>
          </template>
          <template v-else>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <span class="settings-btn__text">내보내기 (백업)</span>
          </template>
        </button>

        <div v-if="isExporting" class="op-progress" role="progressbar" :aria-valuenow="exportProgress" aria-valuemin="0" aria-valuemax="100" :aria-label="exportStep">
          <div class="op-progress__bar" :style="{ width: exportProgress + '%' }"></div>
        </div>

        <p v-if="exportError" class="op-message op-message--error" role="alert">{{ exportError }}</p>

        <!-- Phase B: 백업 완료 후 클라우드 보관 안내 -->
        <div v-if="cloudPrompt" class="cloud-prompt" role="status" aria-live="polite">
          <p class="cloud-prompt__msg">파일이 저장됐어요.</p>
          <p class="cloud-prompt__hint">파일 앱에서 Google Drive나 iCloud Drive로 옮겨 보관하세요.</p>
          <button
            type="button"
            class="cloud-prompt__dismiss-btn"
            @click="dismissCloudPrompt"
          >확인</button>
        </div>

        <p id="export-desc" class="settings-card__hint">
          영수증 이미지를 포함한 모든 데이터를 하나의 파일로 내보냅니다.
        </p>

        <!-- ── 가져오기 ────────────────────────────────────────────────────── -->

        <!-- 확인 메시지 (버튼 클릭 후 표시) -->
        <div v-if="importConfirming" class="import-confirm" role="alert" aria-live="assertive">
          <div class="import-confirm__header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="import-confirm__icon">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
            </svg>
            <strong class="import-confirm__title">데이터가 교체됩니다</strong>
          </div>
          <p class="import-confirm__desc">
            기존 데이터가 모두 백업 파일로 교체됩니다.<br>
            이 작업은 되돌릴 수 없습니다. 계속할까요?
          </p>
          <div class="import-confirm__actions">
            <button type="button" class="import-confirm__btn import-confirm__btn--cancel" @click="cancelImport">
              취소
            </button>
            <button type="button" class="import-confirm__btn import-confirm__btn--ok" @click="onPickFile">
              파일 선택하기
            </button>
          </div>
        </div>

        <!-- 숨김 파일 입력 (버튼으로 트리거) -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".zip"
          aria-hidden="true"
          tabindex="-1"
          style="display:none"
          @change="onFileSelected"
        />

        <!-- 가져오기 버튼 (확인 중이 아닐 때만 표시) -->
        <button
          v-if="!importConfirming"
          type="button"
          class="settings-btn settings-btn--destructive"
          :disabled="isImporting || isExporting"
          :aria-busy="isImporting"
          aria-describedby="import-desc"
          @click="startImportConfirm"
        >
          <template v-if="isImporting">
            <span class="settings-btn__spinner" aria-hidden="true"></span>
            <span class="settings-btn__text">{{ importStep }}</span>
            <span class="settings-btn__pct" aria-hidden="true">{{ importProgress }}%</span>
          </template>
          <template v-else>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <span class="settings-btn__text">가져오기 (복원)</span>
          </template>
        </button>

        <div v-if="isImporting" class="op-progress" role="progressbar" :aria-valuenow="importProgress" aria-valuemin="0" aria-valuemax="100" :aria-label="importStep">
          <div class="op-progress__bar" :style="{ width: importProgress + '%' }"></div>
        </div>

        <!-- 복원 성공 -->
        <div v-if="importSuccess" class="op-message op-message--success" role="status">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          복원이 완료되었습니다.
          <NuxtLink to="/" class="op-message__link">홈에서 확인하기 →</NuxtLink>
        </div>

        <!-- 가져오기 오류 -->
        <p v-if="importError" class="op-message op-message--error" role="alert">{{ importError }}</p>

        <p id="import-desc" class="settings-card__hint settings-card__hint--warning" role="note">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="hint-warning-icon">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
          </svg>
          주의: 기존 데이터가 모두 백업 파일로 교체됩니다.
        </p>

      </div>
    </section>

    <!-- Pro 기능 -->
    <section class="settings-card settings-card--pro" aria-labelledby="pro-heading">
      <div class="pro-card__header">
        <span class="pro-badge">PRO</span>
        <h2 id="pro-heading" class="settings-card__heading">프리미엄 기능</h2>
      </div>
      <p class="pro-card__desc">더 강력하고 안전한 SSOK을 경험해 보세요.</p>

      <div class="settings-card__actions">
        <button
          v-for="feat in proFeatures"
          :key="feat.id"
          type="button"
          class="settings-btn settings-btn--pro"
          @click="openProModal(feat)"
        >
          <span class="settings-btn__icon" aria-hidden="true">{{ feat.icon }}</span>
          <span class="settings-btn__text">{{ feat.label }}</span>
          <span class="settings-btn__badge">예정</span>
        </button>
      </div>
    </section>

    <!-- 앱 정보 -->
    <section class="settings-card settings-card--info" aria-labelledby="app-info-heading">
      <h2 id="app-info-heading" class="settings-card__heading">앱 정보</h2>
      <dl class="settings-info-list">
        <div class="settings-info-list__row">
          <dt>서비스</dt>
          <dd>SSOK (쏙)</dd>
        </div>
        <div class="settings-info-list__row">
          <dt>슬로건</dt>
          <dd>종이는 버리고, 정보만 쏙!</dd>
        </div>
        <div class="settings-info-list__row">
          <dt>데이터 저장</dt>
          <dd>이 기기 (IndexedDB)</dd>
          
        </div>
      </dl>
    </section>
  </div>

  <!-- Pro 기능 안내 모달 -->
  <Teleport to="body">
    <div
      v-if="activeProFeature"
      class="pro-modal-backdrop"
      aria-hidden="true"
      @click="closeProModal"
    ></div>
    <div
      v-if="activeProFeature"
      ref="proModalRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-modal-title"
      tabindex="-1"
      class="pro-modal"
      @keydown.esc="closeProModal"
      @keydown.tab.prevent="trapFocus"
    >
      <div class="pro-modal__top">
        <span class="pro-badge pro-badge--lg">PRO</span>
        <button
          ref="proModalCloseBtnRef"
          type="button"
          class="pro-modal__close"
          aria-label="닫기"
          @click="closeProModal"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <p class="pro-modal__icon" aria-hidden="true">{{ activeProFeature.icon }}</p>
      <h3 id="pro-modal-title" class="pro-modal__title">{{ activeProFeature.label }}</h3>
      <p class="pro-modal__desc">{{ activeProFeature.desc }}</p>
      <p class="pro-modal__price">Pro: 월 900원 <span class="pro-modal__price-note">(예정)</span></p>
      <button
        type="button"
        class="pro-modal__confirm"
        @click="closeProModal"
      >
        확인
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
useHead({ title: '설정 · SSOK' })

// ── Pro 기능 ──────────────────────────────────────────────────────────────────

interface ProFeature {
  id: string
  icon: string
  label: string
  desc: string
}

const proFeatures: ProFeature[] = [
  { id: 'encrypt',   icon: '🔐', label: '백업 파일 암호화',    desc: '백업 파일을 비밀번호로 암호화하여 안전하게 보관하세요.' },
  { id: 'gdrive',    icon: '☁️',  label: 'Google Drive 연동',  desc: 'Google Drive에 자동으로 백업하고 어디서든 복원하세요.' },
  { id: 'ocr',       icon: '✨',  label: 'OCR 고급',           desc: '더 정확한 텍스트 인식으로 영수증을 빠르게 처리하세요.' },
  // { id: 'imgtools',  icon: '✂️',  label: '이미지 크롭 / 회전', desc: '첨부 이미지를 직접 잘라내고 회전하여 깔끔하게 정리하세요.' },
  { id: 'storage',   icon: '📦',  label: '저장 한도 확장',     desc: '더 많은 영수증과 파일을 제한 없이 저장하세요.' },
]

const activeProFeature    = ref<ProFeature | null>(null)
const proModalRef         = useTemplateRef<HTMLElement>('proModalRef')
const proModalCloseBtnRef = useTemplateRef<HTMLButtonElement>('proModalCloseBtnRef')
let proModalTrigger: HTMLElement | null = null

async function openProModal(feat: ProFeature): Promise<void> {
  proModalTrigger = document.activeElement as HTMLElement
  activeProFeature.value = feat
  document.body.style.overflow = 'hidden'
  await nextTick()
  proModalCloseBtnRef.value?.focus()
}

function closeProModal(): void {
  activeProFeature.value = null
  document.body.style.overflow = ''
  proModalTrigger?.focus()
  proModalTrigger = null
}

onUnmounted(() => {
  document.body.style.overflow = ''
})

function trapFocus(e: KeyboardEvent): void {
  const modal = proModalRef.value
  if (!modal) return
  const focusable = Array.from(
    modal.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')
  )
  if (focusable.length < 2) return
  const first = focusable.at(0)!
  const last  = focusable.at(-1)!
  if (e.shiftKey) {
    if (document.activeElement === first) last.focus()
  } else {
    if (document.activeElement === last) first.focus()
    else focusable.at(focusable.indexOf(document.activeElement as HTMLElement) + 1)?.focus()
  }
}

const {
  isExporting, exportProgress, exportStep, exportError, exportBackup,
  cloudPrompt, dismissCloudPrompt,
  isImporting, importProgress, importStep, importError, importSuccess,
  importConfirming, startImportConfirm, cancelImport, importBackup,
  lastBackupAt, lastBackupLabel,
} = useBackup()


// ── 파일 입력 ─────────────────────────────────────────────────────────────────

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')

function onPickFile(): void {
  cancelImport()   // 확인창 닫기 (composable 내부에서 상태 변경)
  fileInputRef.value?.click()
}

function onFileSelected(e: Event): void {
  const input = e.target as HTMLInputElement
  const file  = input.files?.[0]
  input.value = ''   // 같은 파일 재선택 허용
  if (file) importBackup(file)
}
</script>

<style scoped lang="scss">
.settings-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: var(--space-4);

  &__heading {
    font-size: 1.375rem;
    font-weight: 800;
    color: var(--color-text);
    letter-spacing: -0.02em;
  }
}

// ── 카드 ─────────────────────────────────────────────────────────────────────

.settings-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  box-shadow: var(--shadow-card);

  &__heading {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: var(--space-3);
  }

  &__hint {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    font-size: 0.75rem;
    color: var(--color-sub);
    margin-top: var(--space-1);
    margin-bottom: var(--space-3);
    padding-left: var(--space-1);
    line-height: 1.5;

    &--warning { color: var(--color-error-dark); }
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &--info .settings-card__heading { margin-bottom: var(--space-3); }
}

.hint-warning-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--color-error-dark);
}


// ── 마지막 백업 상태 ──────────────────────────────────────────────────────────

.backup-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  margin-bottom: var(--space-4);

  &__icon { flex-shrink: 0; color: var(--color-sub); }

  &__label {
    font-size: 0.8125rem;
    color: var(--color-sub);
    flex-shrink: 0;
  }

  &__value {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text);
    margin-left: auto;

    &--none { color: var(--color-sub); font-weight: 400; }
  }
}

// ── 버튼 ─────────────────────────────────────────────────────────────────────

.settings-btn {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.9375rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast), border-color var(--transition-fast);

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-primary) 6%, var(--color-bg));
    border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  }

  &:disabled { opacity: 0.55; cursor: not-allowed; }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &--destructive { border-color: var(--color-error-border); }

  &__text  { flex: 1; }

  &__badge {
    flex-shrink: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-sub);
    background: var(--color-border);
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
  }

  &__pct {
    flex-shrink: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-primary);
    min-width: 36px;
    text-align: right;
  }

  &__spinner {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin { to { transform: rotate(360deg); } }

// ── 진행률 바 ─────────────────────────────────────────────────────────────────

.op-progress {
  height: 3px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
  margin-top: var(--space-1);
  margin-bottom: var(--space-2);

  &__bar {
    height: 100%;
    background: var(--color-primary);
    border-radius: 2px;
    transition: width 0.3s ease;
  }
}

// ── Phase B: 클라우드 저장 제안 ──────────────────────────────────────────────

.cloud-prompt {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-orange-tint);
  border: 1px solid var(--color-orange-border);
}

.cloud-prompt__msg {
  font-size: 0.875rem;
  color: var(--color-orange-text);
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.cloud-prompt__hint {
  font-size: 0.8125rem;
  color: var(--color-orange-text);
  margin-bottom: var(--space-3);
  line-height: 1.5;
}

.cloud-prompt__dismiss-btn {
  background: none;
  border: none;
  padding: var(--space-1) 0;
  font-size: 0.8125rem;
  font-family: inherit;
  color: var(--color-sub);
  cursor: pointer;
  text-align: center;
  width: 100%;

  &:hover { color: var(--color-text); }
  &:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
}

// ── 상태 메시지 ───────────────────────────────────────────────────────────────

.op-message {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8125rem;
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  margin-top: var(--space-2);
  margin-bottom: var(--space-2);

  &--error {
    color: var(--color-error-dark);
    background: var(--color-error-bg-alt);
    border: 1px solid var(--color-error-border);
  }

  &--success {
    color: var(--color-success);
    background: var(--color-success-bg);
    border: 1px solid var(--color-success-border);
    flex-wrap: wrap;
  }

  &__link {
    color: var(--color-success);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
    margin-left: auto;

    &:focus-visible {
      outline: 2px solid var(--color-success);
      outline-offset: 2px;
      border-radius: 2px;
    }
  }
}

// ── 가져오기 확인 ─────────────────────────────────────────────────────────────

.import-confirm {
  background: var(--color-error-bg-alt);
  border: 1.5px solid var(--color-error-border);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  margin-bottom: var(--space-3);

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  &__icon { flex-shrink: 0; color: var(--color-error-dark); }

  &__title {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-error-dark);
  }

  &__desc {
    font-size: 0.8125rem;
    color: var(--color-text);
    line-height: 1.6;
    margin-bottom: var(--space-4);
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background var(--transition-fast), opacity var(--transition-fast);

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    &--cancel {
      color: var(--color-sub);
      border: 1.5px solid var(--color-border);
      background: var(--color-surface);
      &:hover { background: var(--color-bg); }
    }

    &--ok {
      color: #fff;
      border: 1.5px solid var(--color-error-dark);
      background: var(--color-error-dark);
      &:hover { background: color-mix(in srgb, var(--color-error-dark) 85%, #000); border-color: color-mix(in srgb, var(--color-error-dark) 85%, #000); }
    }
  }
}

// ── Pro 섹션 ─────────────────────────────────────────────────────────────────

.pro-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.05em;

  &--lg {
    font-size: 0.75rem;
    padding: 3px 10px;
  }
}

.settings-card--pro {
  border: 1.5px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  background: color-mix(in srgb, var(--color-primary) 4%, var(--color-surface));

  .settings-card__heading {
    margin-bottom: 0;
    font-size: 0.9375rem;
  }
}

.pro-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.pro-card__desc {
  font-size: 0.8125rem;
  color: var(--color-sub);
  margin-bottom: var(--space-4);
}

.settings-btn--pro {
  margin-bottom: var(--space-2);

  &:last-child { margin-bottom: 0; }

  .settings-btn__icon {
    flex-shrink: 0;
    font-size: 1rem;
    width: 20px;
    text-align: center;
  }
}

// ── Pro 모달 ─────────────────────────────────────────────────────────────────

.pro-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
}

.pro-modal {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
  width: min(360px, calc(100vw - var(--space-6)));
  max-height: calc(100dvh - var(--space-8));
  overflow-y: auto;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: var(--space-4);
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: var(--color-sub);
    cursor: pointer;
    border-radius: var(--radius-sm);
    font-family: inherit;

    &:hover { background: var(--color-bg); color: var(--color-text); }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &__icon {
    font-size: 2.5rem;
    margin-bottom: var(--space-3);
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }

  &__desc {
    font-size: 0.875rem;
    color: var(--color-sub);
    line-height: 1.6;
    margin-bottom: var(--space-4);
  }

  &__price {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-primary);
    margin-bottom: var(--space-5);
  }

  &__price-note {
    font-size: 0.8125rem;
    font-weight: 400;
    color: var(--color-sub);
  }

  &__confirm {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: none;
    border-radius: var(--radius-sm);
    background: var(--color-primary);
    color: #fff;
    font-size: 0.9375rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background var(--transition-fast);

    &:hover { background: color-mix(in srgb, var(--color-primary) 85%, #000); }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 3px;
    }
  }
}

// ── 앱 정보 목록 ──────────────────────────────────────────────────────────────

.settings-info-list {
  display: flex;
  flex-direction: column;
  gap: 0;

  &__row {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    padding: var(--space-2) 0;
    border-top: 1px solid var(--color-border);

    &:first-child { border-top: none; }

    dt {
      flex-shrink: 0;
      width: 80px;
      font-size: 0.8125rem;
      color: var(--color-sub);
    }

    dd { font-size: 0.875rem; color: var(--color-text); }
  }
}
</style>
