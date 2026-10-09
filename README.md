# Badminton Club Communication Platform

배드민턴 클럽 회원 간 소통을 위한 웹 플랫폼입니다.

## 주요 기능

| 영역          | 내용                                                              |
| ------------- | ----------------------------------------------------------------- |
| 클럽·회원     | 카카오 로그인, 클럽 가입 신청과 승인, 회원 관리, 휴대폰 번호 인증 |
| 운동 일정     | 일정 생성·수정·삭제, 참여, 출석 목록, 도움 기록, 주차 신청, 랭킹  |
| 게스트·가입   | 게스트 신청과 가입 문의, 승인·거절, 댓글, 작성자 SMS·이메일 알림  |
| 게시판        | 카테고리 관리, 글·댓글 작성, 좋아요, 상단 고정                    |
| 대회          | 대회 개설, 회원·외부 신청, 참가비 계산, 요강 첨부파일, 신청 CSV   |
| 클럽 맞춤설정 | 홈·게스트 페이지 문구, SMS·이메일 수신자 설정                     |
| 기타          | PWA(홈 화면 설치), 다크모드                                       |

## 기술 스택

| 구분        | 사용 기술                                                        |
| ----------- | ---------------------------------------------------------------- |
| 프레임워크  | Next.js 15 (Pages Router), React 19, TypeScript                  |
| 스타일      | Tailwind CSS 3, 자체 디자인 시스템(토큰 + `src/components` 부품) |
| 상태·폼     | Redux Toolkit, TanStack Query, React Hook Form, Zod              |
| DB          | Supabase PostgreSQL, Prisma 6                                    |
| 인증        | 카카오 OAuth 로그인 뒤 자체 JWT 쿠키(`auth-token`)               |
| 외부 연동   | 네이버 SENS(SMS), Nodemailer(이메일), Supabase Storage(첨부파일) |
| 테스트·검사 | Jest, React Testing Library, ESLint, Prettier                    |
| 배포·자동화 | Vercel, GitHub Actions(CI), Dependabot                           |
| 패키지 관리 | npm                                                              |

## 프로젝트 구조

```
prisma/
├── schema/             # 도메인별 스키마 (여기를 고친다)
├── schema.prisma       # build:schema가 만드는 통합 스키마 (직접 고치지 않는다)
└── migrations/         # 직접 작성한 마이그레이션 SQL
src/
├── pages/              # 화면과 API Routes (pages/api)
├── components/         # atoms, molecules, organisms, templates
├── lib/                # 인증, DB, SMS·이메일, 도메인 로직
├── hooks/              # Custom React Hooks
├── schemas/            # Zod 스키마
├── store/              # Redux 스토어
├── types/              # TypeScript 타입
├── utils/              # 헬퍼 함수
└── __tests__/          # 화면·API 테스트와 규칙 지킴이 테스트
docs/                   # 기획, 가이드, PR 본문 등 (docs/README.md 참고)
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm ci
```

`postinstall`에서 `prisma generate`가 함께 실행됩니다.

### 2. 환경 변수 설정

루트에 `.env` 파일을 만들고 아래 값을 채웁니다. `.env*`는 git에 올라가지 않습니다.

| 변수                                                                        | 용도                                   |
| --------------------------------------------------------------------------- | -------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL`                                                | Supabase PostgreSQL 접속               |
| `JWT_SECRET`                                                                | 로그인 토큰 서명. 32자 이상의 임의 값  |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`                 | Supabase 클라이언트                    |
| `SUPABASE_SERVICE_ROLE_KEY`                                                 | 첨부파일 저장. 서버 전용               |
| `NEXT_PUBLIC_KAKAO_CLIENT_ID`, `NEXT_PUBLIC_KAKAO_JS_KEY`                   | 카카오 로그인                          |
| `SENS_SERVICE_ID`, `SENS_ACCESS_KEY`, `SENS_SECRET_KEY`, `SENS_FROM_NUMBER` | SMS 발송                               |
| `EMAIL_USER`, `EMAIL_PASSWORD`                                              | 이메일 발송                            |
| `SITE_URL`                                                                  | sitemap 생성 기준 주소                 |
| `NEXT_PUBLIC_GA_ID`                                                         | Google Analytics                       |
| `NEXT_PUBLIC_API_URL`                                                       | API 기본 주소. 비우면 같은 출처로 요청 |

### 3. 개발 서버 실행

```bash
npm run dev
```

## 데이터베이스 작업 주의

**`.env`의 `DATABASE_URL`은 프로덕션 DB를 가리킵니다.** 로컬 개발 DB가 따로 없습니다.

- **`npx prisma migrate dev`를 실행하지 않습니다.**
  - 마이그레이션 이력과 실제 DB가 어긋나 있어 DB 전체 리셋을 요구합니다.
- **스키마 변경은 정해진 순서를 따릅니다.**
  - `prisma/schema/*.prisma` 수정 → `npm run build:schema` → `prisma migrate diff`로 확인 → 필요한 SQL만 마이그레이션 파일로 작성 → 적용.
  - 자세한 절차는 [CLAUDE.md](CLAUDE.md)와 [docs/가이드/Prisma 스키마 작업 주의사항.md](docs/가이드/Prisma%20스키마%20작업%20주의사항.md)에 있습니다.

## 검사

```bash
npx tsc --noEmit   # 타입체크
npm run lint       # ESLint (Prettier 규칙 포함)
npm test           # Jest
```

- 화면을 만들거나 고칠 때는 [docs/가이드/디자인-시스템.md](docs/가이드/디자인-시스템.md)를 먼저 읽습니다.
- 로그인이 필요한 화면은 `/dev/screen-preview`, `/dev/admin-preview`에서 가짜 데이터로 확인합니다(운영에서는 404).

## 작업 흐름과 배포

1. `main`에서 브랜치를 만들어 작업하고 PR을 엽니다.
2. GitHub Actions가 타입체크·린트·테스트를 실행합니다. `check`가 통과해야 머지할 수 있습니다.
3. `main`에 머지되면 Vercel이 자동으로 빌드하고 배포합니다.

- `public/sw.js`, `public/workbox-*.js`, `public/sitemap*.xml`은 빌드 때 생성되므로 git에 올리지 않습니다.
- Dependabot이 매주 월요일 npm 패치·마이너 업데이트를 PR 하나로 묶어 올립니다. 메이저 업그레이드는 직접 올립니다.

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 연락처

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.
