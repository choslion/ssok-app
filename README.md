# SSOK

영수증·보증서·설명서를 촬영하거나 업로드해 기기 안에 보관하고, 관련 문서와 보증 기간을 한 항목에서 관리할 수 있도록 만든 **Nuxt 기반 로컬 우선 디지털 서랍**입니다.

- 기획·UI 설계·프론트엔드 개발·정적 배포 단독 수행
- 로그인과 별도 서버 없이 브라우저 안에서 동작
- [Live Demo](https://d34preqwbcth2m.cloudfront.net/)

## 핵심 기능

- **문서 촬영과 통합 보관** — 이미지와 PDF를 영수증·보증서·설명서로 분류하고, 여러 종류와 페이지의 문서를 하나의 항목에 묶어 관리합니다.
- **OCR와 자동 입력** — 사용자가 요청할 때 Tesseract.js를 불러와 구매처·날짜·금액 후보를 추출하며, PDF 메타데이터와 파일명을 활용해 제목을 제안합니다.
- **탐색과 보증 관리** — 문서 종류 필터와 구매일·이름 정렬, 공간·제품별 탐색을 제공하고 보증 만료 30일 전부터 알림을 표시합니다.
- **문서 열람과 이미지 편집** — 종류별 탭과 다중 페이지 뷰어, 이미지 확대·회전·자르기를 제공하며 PDF는 새 탭에서 확인합니다.
- **로컬 저장과 PWA** — 항목·첨부 파일·OCR 결과를 IndexedDB에 저장하고, 홈 화면 설치와 정적 자원 캐시, 전체 데이터의 ZIP 백업·복원을 지원합니다.

## 기술적으로 해결한 문제

### 이미지가 쌓일수록 커지는 브라우저 저장 비용

- 업로드 이미지를 클라이언트에서 최대 너비 1200px로 조정하고 WebP로 변환하며, 미지원 환경에서는 JPEG로 저장합니다.
- 항목 정보와 첨부 Blob을 분리해 목록에서는 메타데이터만 조회하고, 첨부 파일은 상세 화면에 들어갔을 때 불러옵니다.
- 화면 이동과 파일 교체 시 생성한 Object URL을 해제해 브라우저 메모리에 불필요한 참조가 남지 않도록 처리했습니다.

### OCR 초기화 비용과 촬영 환경에 따른 인식 편차

- Tesseract.js를 첫 화면에 포함하지 않고 사용자가 OCR을 실행한 시점에 동적으로 불러옵니다.
- 촬영 영수증의 그림자와 고르지 않은 조명에 대응하기 위해 2400px 업스케일, 그레이스케일 변환과 Bradley–Roth 적응형 이진화를 적용했습니다.
- 한·영 OCR 결과에서 구매처·날짜·금액 후보와 신뢰도를 구성하고, 사용자가 확인해 선택한 값만 항목 정보에 반영합니다.

### 한 항목에 연결되는 여러 문서 종류와 페이지

- 항목과 첨부 파일을 분리하고 첨부에는 문서 종류를, 항목에는 첨부 순서를 저장해 영수증·보증서·설명서를 한곳에서 관리합니다.
- 보유한 문서 종류를 탭으로 나누고 저장 후에도 관련 문서나 페이지를 추가할 수 있도록 구성했습니다.
- PDF의 제목 메타데이터와 파일명을 순서대로 확인하고, 유효한 값이 없으면 문서 종류와 날짜를 조합해 제목을 생성합니다.

### 여러 화면과 입력 방식에서 반복되는 UI 규칙

- 색상·간격·모서리·그림자·전환 시간을 역할 기반 CSS 토큰으로 정의하고 공통 화면에 적용했습니다.
- PageHeader·ItemCard·ChipRow·SpaceSheet를 공통 컴포넌트로 분리하고, 목록 진입 모션은 GSAP composable로 재사용합니다.
- 문서 뷰어의 방향키 이동과 현재 페이지 안내, 모달의 포커스 트랩·복귀, 이미지 자르기 영역의 키보드 이동·조절을 구현했습니다.

### 서버 없는 데이터 백업과 복원

- IndexedDB의 항목·첨부 Blob·OCR 결과·설정을 하나의 ZIP 파일로 내보냅니다.
- 복원 전에 필수 파일과 포맷 버전, 항목·첨부·OCR 결과 사이의 참조 관계를 검사합니다.
- 기존 데이터를 교체하는 작업임을 먼저 안내하고, 내보내기와 복원 단계를 진행률과 함께 표시합니다.

## 구조

```text
Nuxt 4 · Vue 3 · TypeScript SPA/PWA
        ├─ pages · components     화면과 공통 UI
        ├─ composables · utils    저장·OCR·백업·파일 처리
        └─ IndexedDB
             ├─ items
             ├─ attachments
             ├─ receiptExtracts
             └─ settings

Nuxt Generate → AWS S3 + CloudFront
```

`ssr: false`인 클라이언트 앱이며, 별도의 API 서버 없이 정적 산출물을 배포합니다. OCR과 이미지 처리, 백업 파일 생성도 브라우저에서 실행합니다.

## 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | Nuxt 4, Vue 3, TypeScript |
| Style & Motion | SCSS, CSS Design Tokens, GSAP |
| Local Data | IndexedDB, idb |
| OCR & Image | Tesseract.js, Canvas API |
| PWA | @vite-pwa/nuxt, Workbox |
| Backup | JSZip |
| Metadata | Open Graph, Schema.org JSON-LD, sitemap.xml |
| Deploy | Nuxt Generate, AWS S3, CloudFront |

## 로컬 실행

```bash
git clone https://github.com/choslion/ssok-app.git
cd ssok-app
npm install
npm run dev
```

별도의 환경 변수나 API 키는 필요하지 않습니다.

## 검증

```bash
npm run build
npm run generate
```

정적 배포에는 `npm run generate`로 생성되는 `.output/public` 디렉터리를 사용합니다. 산출물은 `npm run preview`로 확인할 수 있습니다.

## 데이터 및 이용 안내

- 데이터는 현재 브라우저와 기기의 IndexedDB에 저장되며, 브라우저 데이터를 삭제하면 함께 사라질 수 있습니다.
- 중요한 자료는 설정 화면에서 정기적으로 ZIP 백업을 내려받아 별도 위치에 보관해야 합니다.
- 복원하면 기존 데이터가 백업 파일의 내용으로 교체되며 되돌릴 수 없습니다.
- 백업 ZIP은 암호화되지 않으므로 민감한 문서가 포함된 파일의 보관 위치에 주의해야 합니다.
- OCR은 브라우저에서 실행되지만 처음 사용할 때 한·영 언어 데이터를 내려받기 위해 네트워크 연결이 필요할 수 있습니다.
