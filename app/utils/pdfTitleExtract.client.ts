/**
 * PDF 제목 추출 (라이브러리 없이 raw bytes 파싱)
 *
 * 1순위: PDF /Info 딕셔너리의 /Title 메타데이터
 *   - ASCII 리터럴: /Title (텍스트)
 *   - UTF-16BE 헥스: /Title <FEFF0041...>  → 한국어 제목 지원
 * 2순위: 파일명 기반 힌트 (scan/img 등 무의미한 이름 제외)
 * 실패 시: null 반환 → add.vue의 날짜 기반 fallback 사용
 */

/** PDF /Title 메타데이터에서 제목 추출 */
export async function extractPdfTitle(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer()
    // latin-1 디코딩으로 ASCII/PDFDocEncoding 메타데이터 접근
    const raw = new TextDecoder('latin1').decode(new Uint8Array(buffer))

    // ASCII 리터럴 문자열: /Title (텍스트)
    const asciiMatch = raw.match(/\/Title\s*\(([^)]{2,80})\)/)
    if (asciiMatch) {
      const title = cleanPdfText(asciiMatch[1])
      if (isUsableTitle(title)) return truncate(title)
    }

    // UTF-16BE 헥스 문자열: /Title <FEFF001C...>  (한국어 포함 멀티바이트)
    const hexMatch = raw.match(/\/Title\s*<([0-9A-Fa-f\s]{4,})>/)
    if (hexMatch) {
      const title = decodeHexUtf16(hexMatch[1].replace(/\s/g, ''))
      if (isUsableTitle(title)) return truncate(title)
    }

    return null
  } catch {
    return null
  }
}

/** 파일명에서 의미있는 제목 힌트 추출 */
export function filenameHint(filename: string): string | null {
  // 확장자 제거, 구분자 → 공백
  const name = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_\-.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (name.length < 3) return null

  // scan/img/document 같은 의미없는 이름 패턴
  const noise = /^(scan|img|image|dsc|dcim|document|doc|file|untitled|무제|문서|스캔|캡처|capture|photo|pic)\d*$/i
  if (noise.test(name.replace(/\s/g, ''))) return null

  // 숫자만인 경우
  if (/^\d[\d\s]*$/.test(name)) return null

  return truncate(name)
}

// ── helpers ──────────────────────────────────────────────────────────────────

function decodeHexUtf16(hex: string): string {
  // BOM(FEFF) 제거
  const data = /^feff/i.test(hex) ? hex.slice(4) : hex
  let result = ''
  for (let i = 0; i + 3 < data.length; i += 4) {
    const code = parseInt(data.slice(i, i + 4), 16)
    if (!isNaN(code)) result += String.fromCharCode(code)
  }
  return result
}

function cleanPdfText(text: string): string {
  return text
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, '')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim()
}

function isUsableTitle(text: string): boolean {
  if (!text || text.length < 3) return false
  // 한글, 영문, 숫자 중 적어도 하나 포함
  if (!/[\uAC00-\uD7A3a-zA-Z0-9]/.test(text)) return false
  // 제어문자나 깨진 인코딩(대부분 비ASCII 특수문자로 구성) 제외
  const nonPrintable = text.replace(/[\uAC00-\uD7A3\u0020-\u007E\u00A0-\u00FF]/g, '')
  if (nonPrintable.length > text.length * 0.3) return false
  return true
}

function truncate(text: string, max = 20): string {
  if (text.length <= max) return text
  // 공백 기준 단어 경계에서 자름
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut
}
