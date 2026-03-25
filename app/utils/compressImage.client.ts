/**
 * Canvas 기반 이미지 리사이즈 + WebP 변환 유틸리티
 *
 * - image/* 파일만 처리 (PDF·비이미지 파일은 그대로 반환)
 * - maxWidth=1200 초과 시만 다운샘플 (이미 작은 이미지는 크기 변경 없음)
 * - WebP 지원 브라우저: WebP 출력 / 미지원 시 JPEG fallback
 * - 오류 발생 시 원본 파일 반환 (silent fallback)
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.85,
): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  let objectUrl: string | null = null
  try {
    objectUrl = URL.createObjectURL(file)

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('이미지 로드 실패'))
      el.src = objectUrl!
    })

    let width = img.naturalWidth
    let height = img.naturalHeight

    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width)
      width = maxWidth
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

    // WebP 지원 여부 1회 감지 (toDataURL은 빠름 — 실제 인코딩 아님)
    const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp')
    const outputMime = supportsWebP ? 'image/webp' : 'image/jpeg'
    const ext = supportsWebP ? '.webp' : '.jpg'

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('캔버스 → Blob 변환 실패'))),
        outputMime,
        quality,
      )
    })

    const baseName = file.name.replace(/\.[^.]+$/, '')
    return new File([blob], baseName + ext, { type: outputMime })
  } catch (err) {
    console.warn('[compressImage] 압축 실패, 원본 사용:', err)
    return file
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}
