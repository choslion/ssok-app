# 📦 SSOK (쏙) - Digital Drawer

> **종이는 버리고, 정보만 쏙!**
> *Toss the paper, keep the info!*

**SSOK(쏙)**은 서랍 속에 쌓여가는 종이 영수증, 제품 설명서, 보증서를 사진으로 찍어 스마트폰 안에 깔끔하게 보관하고 관리하는 **디지털 서랍** 서비스입니다.

---

## ✨ 주요 기능 (Key Features)

* **📷 Fast Capture & Store**: 영수증이나 설명서를 촬영하거나 업로드하여 즉시 저장합니다.
* **📂 Smart Spaces**: 거실, 주방, 내 방 등 보관 장소별로 물건을 분류하고 폴더 형태로 탐색합니다.
* **⏳ Warranty Tracker**: 보증 기간이 임박한 물건들을 한눈에 확인하고 관리합니다.
* **🔒 Privacy First**: 모든 데이터는 서버가 아닌 브라우저 내 IndexedDB에 안전하게 보관됩니다. (No Cloud, No Login)
* **💾 Local Backup**: 전체 데이터를 ZIP 파일(`.zip`)로 내보내거나 가져올 수 있어 데이터 손실 걱정이 없습니다.
* **📱 PWA Ready**: 별도의 설치 없이 홈 화면에 추가하여 앱처럼 쾌적하게 사용할 수 있습니다.

---

## 🛠 Tech Stack

| Category | Technology | Version |
| :--- | :--- | :--- |
| **Framework** | [Nuxt 4](https://nuxt.com/) | `^4.3.1` |
| **Language** | TypeScript | — |
| **Storage** | IndexedDB via [`idb`](https://github.com/jakearchibald/idb) | `^8.0.3` |
| **PWA** | [`@vite-pwa/nuxt`](https://vite-pwa-org.netlify.app/frameworks/nuxt) | `^1.1.1` |
| **Animation** | [GSAP](https://gsap.com/) | `^3.14.2` |
| **OCR** | [Tesseract.js](https://tesseract.projectnaptha.com/) (lazy-loaded) | `^7.0.0` |
| **Backup** | [JSZip](https://stuk.github.io/jszip/) | `^3.10.1` |
| **Styles** | SCSS via `sass` | `^1.97.3` |
| **Deployment** | Static Site Generation (SSG) → AWS S3 + CloudFront | — |

---

## 🚀 시작하기 (Getting Started)

### Installation

```bash
# 레포지토리 클론 (자신의 계정 명으로 수정하세요)
git clone https://github.com/your-username/ssok-app.git

# 의존성 설치
npm install
```

### Usage

```bash
# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드 (SSR / node-server)
npm run build

# 정적 사이트(SSG) 생성 → .output/public/
npm run generate

# 빌드 결과물 미리보기
npm run preview
```

---

## 🌐 배포 (Deployment)

SSOK은 `npm run generate`로 생성된 정적 파일을 **AWS S3 + CloudFront**로 배포합니다.
전체 배포 흐름은 `/ssok-deploy` 스킬(`.claude/skills/ssok-deploy/SKILL.md`)을 참고하세요.

### 요약 절차

1. **빌드 검증** — `npm run build` 및 `npm run generate` 가 오류 없이 완료되는지 확인합니다.
2. **S3 업로드**
   ```bash
   aws s3 sync .output/public/ s3://<BUCKET_NAME>/ --delete
   ```
3. **CloudFront 캐시 무효화**
   ```bash
   aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
   ```
4. **스모크 테스트** — CloudFront URL에서 `/`, `/add`, `/expiring`, `/spaces`, `/item/[id]` 를 확인합니다.

> `<BUCKET_NAME>` 및 `<DIST_ID>` 는 실제 AWS 리소스 값으로 교체하세요.
> S3 버킷 정책에서 모든 경로에 대해 `index.html`을 서빙하도록 설정해야 새로고침 시 404가 발생하지 않습니다.
