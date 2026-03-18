// OCR composable — client-only.
// Wraps Tesseract.js with lazy (dynamic) import + Canvas preprocessing.
// Never call this automatically on upload; always await explicit user action.

import type { ReceiptCandidate } from '~~/shared/types/ssok'

export interface OcrResult {
  rawText: string
  merchant?: ReceiptCandidate
  date?: ReceiptCandidate
  amount?: ReceiptCandidate
}

export interface OcrProgress {
  status: string
  percent: number // 0–100
}

// Loose shape of a Tesseract.js Line object (from data.lines in v7).
// Using a local interface avoids importing heavy Tesseract types.
interface TesseractLine {
  text: string
  confidence: number // 0–100
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

// ── Bradley-Roth adaptive thresholding ────────────────────────────────────
// Unlike Otsu (single global threshold), Bradley-Roth computes a LOCAL mean
// for each pixel using an integral image (O(w·h) complexity), then sets the
// threshold to 85% of that mean. This handles phone-camera receipts with
// uneven lighting, gradients, and shadows far better than a global threshold.

function adaptiveThreshold(gray: number[], w: number, h: number): void {
  // Block size: ~1/15 of the shorter side, rounded to nearest odd number
  let blockSize = Math.round(Math.min(w, h) / 15)
  if (blockSize % 2 === 0) blockSize++
  const half = Math.floor(blockSize / 2)

  // Build prefix-sum table (integral image), 1-indexed with a zero border row/col
  const stride = w + 1
  const integral = new Float32Array(stride * (h + 1))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      integral[(y + 1) * stride + (x + 1)] =
        gray[y * w + x]! +
        integral[y * stride + (x + 1)]! +
        integral[(y + 1) * stride + x]! -
        integral[y * stride + x]!
    }
  }

  // Threshold: pixel is foreground (black) if it is < 85% of its local mean
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half)
      const y1 = Math.max(0, y - half)
      const x2 = Math.min(w - 1, x + half)
      const y2 = Math.min(h - 1, y + half)
      const area = (x2 - x1 + 1) * (y2 - y1 + 1)
      const sum =
        integral[(y2 + 1) * stride + (x2 + 1)]! -
        integral[y1 * stride + (x2 + 1)]! -
        integral[(y2 + 1) * stride + x1]! +
        integral[y1 * stride + x1]!
      gray[y * w + x] = gray[y * w + x]! < (sum / area) * 0.85 ? 0 : 255
    }
  }
}

// ── Image preprocessing ────────────────────────────────────────────────────
// 1. Upscale to ≥ 2 400 px on the long side (more pixels per glyph).
// 2. Luminance-weighted grayscale.
// 3. Bradley-Roth adaptive binarisation → pure black/white PNG.

async function preprocessImage(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = url
  })
  URL.revokeObjectURL(url)

  const TARGET = 2400
  const longerSide = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = longerSide < TARGET ? TARGET / longerSide : 1
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return blob

  ctx.drawImage(img, 0, 0, w, h)

  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data
  const total = w * h

  // Pass 1: luminance grayscale into a plain number array
  const gray: number[] = new Array(total)
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    gray[j] = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!
  }

  // Pass 2: Bradley-Roth adaptive binarisation (modifies gray in-place)
  adaptiveThreshold(gray, w, h)

  // Write result back to canvas
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    d[i] = d[i + 1] = d[i + 2] = gray[j]!
    // alpha unchanged
  }
  ctx.putImageData(imageData, 0, 0)

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(b => resolve(b ?? blob), 'image/png')
  })
}

// ── Text normalisation ─────────────────────────────────────────────────────
// Tesseract sometimes inserts stray spaces inside numbers/words.
// Normalise before regex matching: "1 2,500" → "12,500".

function normalise(text: string): string {
  return text
    .replace(/(\d)\s+(?=[\d,])/g, '$1') // "1 2,500" → "12,500"
    .replace(/,\s+(?=\d)/g, ',')         // "1, 500"  → "1,500"
}

// ── Merchant extraction ────────────────────────────────────────────────────

// Lines to skip when falling back to heuristic candidate selection
const MERCHANT_SKIP = /^(영\s*수\s*증|매출\s*전표|신용\s*카드|체크\s*카드|고\s*객\s*용|가\s*맹\s*점|감사합니다|이용해\s*주|주셔서|전표\s*번호|승인\s*번호|카드\s*번호|주문\s*번호|사업자|대표자|주\s*소|연\s*락처|테이블|TABLE|담당|직원|서버|주문|TEL|FAX|www\.|http|합\s*계|결제|승인|청구|계산\s*일자|인쇄\s*일자|발행\s*일자|계산\s*담당|시\s*간|\d+\s*번(?:\s*테이블)?|No\.\s*\d|NO\.\s*\d)/i

// All Korean label synonyms for the merchant/store name field
const MERCHANT_LABEL_RE = /(?:가\s*맹\s*점\s*명?|상\s*호\s*명?|가\s*게\s*이\s*름|가\s*게\s*명|매\s*장\s*명|업\s*소\s*명|업\s*체\s*명|상\s*점\s*명|점\s*명|사업\s*장\s*명)/i

// Remove trailing metadata that can bleed onto the same line as the store name:
// phone numbers, business registration numbers, city/province addresses.
function cleanMerchantValue(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*[\d\-()]{9,}.*$/, '')                                   // trailing phone/serial
    .replace(/\s*\d{3}-\d{2}-\d{5}.*$/, '')                              // business reg number
    .replace(/\s*(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주)\s*[가-힣].*$/, '') // address
    .replace(/:\s*$/, '')                                                 // trailing colon → pure label
    .trim()
}

function extractMerchant(
  raw: string,
  lines: TesseractLine[],
): ReceiptCandidate | undefined {
  const text = normalise(raw)

  // ── 0순위: Tesseract 구조화 라인별 인라인 매칭 ────────────────────────
  // 전체 텍스트 매칭보다 우선 시도: 각 라인 객체는 이미 줄 단위로 분리돼 있어
  // 다음 줄(사업자번호, TEL 등)이 캡처값에 섞이는 문제를 방지함.
  // 상단 50% 이내 라인만 탐색.
  if (lines.length > 0) {
    const maxY = lines.reduce((m, l) => Math.max(m, l.bbox.y1), 0)
    const topLines = lines
      .filter(l => l.bbox.y0 < maxY * 0.50)
      .sort((a, b) => a.bbox.y0 - b.bbox.y0)
    for (const line of topLines) {
      const lt = normalise(line.text.trim())
      const m = lt.match(new RegExp(MERCHANT_LABEL_RE.source + String.raw`\s*:?\s*(.{2,40})`))
      if (m) {
        const val = cleanMerchantValue(m[1]!)
        if (val.length >= 2) return { value: val.slice(0, 40), confidence: 0.93 }
      }
    }
  }

  // ── 1순위: label + value on the same line (전체 텍스트 폴백) ───────────
  // Tesseract 구조화 데이터가 없을 때 전체 raw text에서 시도.
  // Example: "가맹점명 : 홍길동식당", "상호 OO마트"
  const inlineMatch = text.match(
    new RegExp(MERCHANT_LABEL_RE.source + String.raw`\s*:?\s*([^\n\r]{2,40})`),
  )
  if (inlineMatch) {
    const val = cleanMerchantValue(inlineMatch[1]!)
    if (val.length >= 2)
      return { value: val.slice(0, 40), confidence: 0.93 }
  }

  // ── Build a clean, position-ordered line list ─────────────────────────
  // Prefer Tesseract's structured data (has bbox + per-line confidence).
  // Restrict search to the TOP 50% of the receipt — merchant is always
  // in the header; searching beyond that causes false positives (e.g. item
  // names, table numbers in the body).

  let candidateLines: Array<{ text: string; conf: number }> = []

  if (lines.length > 0) {
    const maxY = lines.reduce((m, l) => Math.max(m, l.bbox.y1), 0)
    const cutoffY = maxY * 0.50

    candidateLines = lines
      .filter(l => l.bbox.y0 < cutoffY)
      .sort((a, b) => a.bbox.y0 - b.bbox.y0)
      .map(l => ({ text: normalise(l.text.trim()), conf: l.confidence }))
      .filter(l => l.text.length >= 2)
  } else {
    // Fallback: use plain text lines, limited to the first 40%
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 2)
    const limit = Math.max(Math.ceil(rawLines.length * 0.40), 8)
    candidateLines = rawLines.slice(0, limit).map(t => ({ text: t, conf: 100 }))
  }

  // ── 2순위: label on its own line, value on the next non-empty line ─────
  // Example: "상호\n홍길동식당"
  for (let i = 0; i < candidateLines.length - 1; i++) {
    const line = candidateLines[i]!.text
    if (!MERCHANT_LABEL_RE.test(line)) continue
    const remainder = line.replace(MERCHANT_LABEL_RE, '').replace(/[:\s]/g, '')
    if (remainder.length > 0) continue // value is on the same line — already handled above

    // Label is alone on this line; find the next meaningful line
    for (let j = i + 1; j < candidateLines.length; j++) {
      const next = candidateLines[j]!.text
      if (next.length === 0) continue
      if (next.length >= 2 && next.length <= 50 && !MERCHANT_SKIP.test(next)) {
        const val = cleanMerchantValue(next)
        if (val.length >= 2)
          return { value: val.slice(0, 40), confidence: 0.88 }
      }
      break // first non-empty line after label (even if skipped) stops the search
    }
  }

  // ── 3순위: heuristic fallback (conservative) ──────────────────────────
  // Only attempt when:
  //   • OCR confidence for the line is ≥ 50 (lines below this are usually garbage)
  //   • Line has ≥ 3 consecutive Korean characters (not noise or code)
  //   • Line is NOT in the skip list
  // Prefer undefined over a wrong answer.

  const strictCandidates = candidateLines.filter(l =>
    l.conf >= 50 &&
    l.text.length >= 3 &&
    l.text.length <= 40 &&
    !MERCHANT_SKIP.test(l.text) &&
    !/^\d/.test(l.text) &&                  // starts with digit → number/code
    !/^\d+\s*번/.test(l.text) &&            // table/order number
    !/^[A-Z0-9\-_]{4,}$/.test(l.text) &&   // all-caps serial/code
    !/:\s*$/.test(l.text),                  // ends with ":" → pure label line (계산일자: 등)
  )

  const koFallback = strictCandidates.find(l => /[가-힣]{3,}/.test(l.text))
  if (koFallback) {
    const val = cleanMerchantValue(koFallback.text)
    if (val.length >= 2) {
      // Confidence is intentionally low: this is a guess, not a label match.
      // Map OCR confidence (0-100) to a low candidate confidence (0–0.50).
      const c = Math.min(0.50, (koFallback.conf / 100) * 0.50)
      return { value: val.slice(0, 40), confidence: c }
    }
  }

  // No reliable candidate found — return undefined rather than guess wrong.
  return undefined
}

// ── Date extraction ────────────────────────────────────────────────────────

function extractDate(raw: string): ReceiptCandidate | undefined {
  const text = normalise(raw)

  // Korean: 2024년 3월 10일 / 2024년03월10일
  const koMatch = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (koMatch) {
    return {
      value: `${koMatch[1]}-${koMatch[2]!.padStart(2, '0')}-${koMatch[3]!.padStart(2, '0')}`,
      confidence: 0.92,
    }
  }

  // ISO-ish: 2024-03-10 / 2024/03/10 / 2024.03.10
  const isoMatch = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1]!, 10)
    if (year >= 2000 && year <= 2099) {
      return {
        value: `${isoMatch[1]}-${isoMatch[2]!.padStart(2, '0')}-${isoMatch[3]!.padStart(2, '0')}`,
        confidence: 0.82,
      }
    }
  }

  // Short: 24.03.10 / 24-03-10
  const shortMatch = text.match(/\b(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})\b/)
  if (shortMatch) {
    return {
      value: `20${shortMatch[1]}-${shortMatch[2]!.padStart(2, '0')}-${shortMatch[3]!.padStart(2, '0')}`,
      confidence: 0.62,
    }
  }

  return undefined
}

// ── Amount extraction ──────────────────────────────────────────────────────

function isLikelyNotAmount(digits: string): boolean {
  if (digits.length >= 8) return true
  if (/^\d{3}-?\d{2}-?\d{5}$/.test(digits)) return true
  return false
}

function parseAmount(raw: string): number {
  return parseInt(raw.replace(/[\s,]/g, ''), 10)
}

function extractAmount(raw: string): ReceiptCandidate | undefined {
  const text = normalise(raw)

  // 1순위: 합계/결제/승인 관련 키워드 + 금액
  // 지원 형식:
  //   일반형:   합계: 30,000 / 결제금액: 30,000
  //   괄호형:   매출합계(카드) 30,000   ← 카드 단말기 영수증
  //   대괄호형: [결제금액] 30,000       ← 카드 단말기 영수증
  const highMatch = text.match(
    /\[?(?:매출\s*)?(?:합\s*계|총\s*액|결제\s*금액?|승인\s*금액?|청구\s*금액?|최종\s*금액?|합계\s*금액?|총\s*결제|받\s*을\s*돈)(?:\]|\s*\([^)]*\))?\s*[:\s]?\s*[₩￦]?\s*([\d,]{1,10})/i,
  )
  if (highMatch) {
    const digits = highMatch[1]!.replace(/,/g, '')
    const n = parseAmount(highMatch[1]!)
    if (!isNaN(n) && n > 0 && !isLikelyNotAmount(digits))
      return { value: n.toLocaleString('ko-KR') + '원', confidence: 0.93 }
  }

  // 2순위: TOTAL / AMOUNT 영문 키워드
  const totalMatch = text.match(/(?:TOTAL|SUBTOTAL|AMOUNT)\s*[:\s]\s*[₩￦$]?\s*([\d,]{1,10})/i)
  if (totalMatch) {
    const digits = totalMatch[1]!.replace(/,/g, '')
    const n = parseAmount(totalMatch[1]!)
    if (!isNaN(n) && n > 0 && !isLikelyNotAmount(digits))
      return { value: n.toLocaleString('ko-KR') + '원', confidence: 0.80 }
  }

  // 3순위: "원" 단위 명시된 숫자 중 최댓값
  const wonCandidates = [...text.matchAll(/[₩￦]?\s*([\d,]{3,9})\s*원/g)]
    .map(m => ({ digits: m[1]!.replace(/,/g, ''), n: parseAmount(m[1]!) }))
    .filter(({ digits, n }) => !isNaN(n) && n >= 100 && !isLikelyNotAmount(digits))
  if (wonCandidates.length) {
    const largest = wonCandidates.reduce((a, b) => (a.n >= b.n ? a : b))
    return { value: largest.n.toLocaleString('ko-KR') + '원', confidence: 0.58 }
  }

  // 4순위: "원" 표기 없는 숫자 — 카드 단말기 영수증처럼 한국어 키워드가 OCR에서 깨질 때 대응.
  // 합계 금액은 영수증 본체 + 카드 전표 양쪽에 인쇄되므로 같은 값이 2회 이상 등장하는
  // 경우 합계일 가능성이 높음. 카드번호·사업자번호 등 코드는 보통 1회만 등장.
  const numFreq = new Map<number, number>()
  for (const m of text.matchAll(/\b([\d,]{4,9})\b/g)) {
    const digits = m[1]!.replace(/,/g, '')
    const n = parseAmount(m[1]!)
    if (!isNaN(n) && n >= 1000 && !isLikelyNotAmount(digits))
      numFreq.set(n, (numFreq.get(n) ?? 0) + 1)
  }
  // 2회 이상 → 합계 후보 중 최댓값
  const repeated = [...numFreq.entries()].filter(([, c]) => c >= 2)
  if (repeated.length) {
    const best = repeated.reduce((a, b) => (a[0] >= b[0] ? a : b))
    return { value: best[0].toLocaleString('ko-KR') + '원', confidence: 0.42 }
  }
  // 1회 등장 최댓값 (마지막 수단)
  if (numFreq.size > 0) {
    const best = [...numFreq.entries()].reduce((a, b) => (a[0] >= b[0] ? a : b))
    return { value: best[0].toLocaleString('ko-KR') + '원', confidence: 0.28 }
  }

  return undefined
}

// ── Composable ─────────────────────────────────────────────────────────────

export const useOcr = () => {
  /**
   * Run OCR on an image Blob.
   * Call only on explicit user action — never on upload.
   *
   * PSM choice: PSM 4 (SINGLE_COLUMN) is kept intentionally.
   * Korean thermal receipts are a single narrow column; PSM 4 tells Tesseract
   * not to waste time guessing layout, which improves speed and accuracy.
   * PSM 3 (AUTO) was tested but causes layout-detection overhead and slightly
   * worse line segmentation on narrow receipt prints.
   */
  async function recognize(
    imageBlob: Blob,
    onProgress: (p: OcrProgress) => void,
  ): Promise<OcrResult> {
    const { createWorker } = await import('tesseract.js')

    onProgress({ status: '이미지 전처리 중…', percent: 2 })

    // Preprocess: upscale → grayscale → Bradley-Roth adaptive binarisation
    const processedBlob = await preprocessImage(imageBlob)

    onProgress({ status: 'OCR 엔진 초기화 중…', percent: 8 })

    const worker = await createWorker(['kor', 'eng'], 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status.includes('load')) {
          onProgress({ status: '언어 데이터 로딩 중…', percent: 8 + Math.round(m.progress * 35) })
        } else if (m.status.includes('initializ')) {
          onProgress({ status: 'OCR 초기화 중…', percent: 43 + Math.round(m.progress * 17) })
        } else if (m.status === 'recognizing text') {
          onProgress({ status: '텍스트 인식 중…', percent: 60 + Math.round(m.progress * 38) })
        }
      },
    })

    try {
      // PSM 4 = SINGLE_COLUMN — see JSDoc above for rationale
      // OEM 1 = LSTM only — performs better on Korean than the default OEM 3 (LSTM+Legacy hybrid)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await worker.setParameters({
        tessedit_pageseg_mode: '4',
        tessedit_ocr_engine_mode: '1',
      } as any)

      onProgress({ status: '텍스트 인식 중…', percent: 60 })

      const { data } = await worker.recognize(processedBlob)

      onProgress({ status: '결과 분석 중…', percent: 99 })

      // Use Tesseract's structured line data (bbox + confidence) for merchant
      // extraction; fall back to raw text for date/amount (simpler patterns).
      // data.lines may be empty in some Tesseract.js versions — flatten from blocks.
      const d = data as any
      const lines = (
        (d.lines?.length ? d.lines : undefined) ??
        d.blocks?.flatMap((b: any) =>
          b.paragraphs?.flatMap((p: any) => p.lines ?? []) ?? []
        ) ??
        []
      ) as TesseractLine[]

      const merchant = extractMerchant(data.text, lines)
      const date = extractDate(data.text)
      const amount = extractAmount(data.text)

      return { rawText: data.text, merchant, date, amount }
    } finally {
      await worker.terminate()
    }
  }

  return { recognize }
}
