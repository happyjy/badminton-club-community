# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

배드민턴 클럽 커뮤니케이션 플랫폼 - 클럽 관리, 운동 일정, 게스트 신청, 게시판, SMS 알림, 회비 정산 기능을 제공하는 Next.js 풀스택 웹앱

## 주요 명령어

```bash
pnpm dev                    # 개발 서버 (localhost:3000)
pnpm build                  # 프로덕션 빌드
pnpm lint                   # ESLint 검사
pnpm lint:fix               # ESLint 자동 수정
pnpm test                   # Jest 테스트 전체 실행
pnpm test -- --testPathPattern="파일명"  # 특정 테스트 파일 실행
pnpm test:watch             # Watch 모드 테스트

# Prisma (스키마 변경 시 반드시 build:schema 먼저)
pnpm run build:schema       # schema/ 폴더 → schema.prisma 생성
npx prisma generate         # Prisma 클라이언트 생성
npx prisma migrate dev      # DB 마이그레이션
```

## 기술 스택

- **프레임워크**: Next.js 15 (Pages Router), React 19, TypeScript
- **스타일링**: Tailwind CSS, shadcn/ui
- **상태관리**: Redux Toolkit, React Query
- **폼**: React Hook Form + Zod
- **DB**: PostgreSQL (Supabase), Prisma ORM
- **인증**: NextAuth.js (Kakao 로그인)
- **API 호출**: Axios (fetch 사용 금지)

## 아키텍처

### 컴포넌트 구조 (Atomic Design)

```
src/components/
├── atoms/       # 기본 UI (Button, Input, Label)
├── molecules/   # 조합 컴포넌트 (CommentItem, FormField)
├── organisms/   # 큰 단위 (Modal, Form, Navigation)
└── templates/   # 페이지 레이아웃
```

### 주요 디자인 패턴

- **Compound Component**: `src/components/organisms/modal/join/` - JoinModal과 하위 컴포넌트들
- **Strategy Pattern**: `src/strategies/` - 게스트 페이지 동작 분기
- **Custom Hooks**: `src/hooks/` - 기능별 로직 분리 (useAuth, useClub, useBoardPosts 등)

### 상태 관리 레이어

- **Redux**: 전역 상태 (auth, club) - `src/store/features/`
- **React Query**: 서버 상태 (API 캐싱, 동기화)
- **Context API**: 지역 상태 (JoinModalContext, ParticipantSortContext)

### API 구조

```
src/pages/api/clubs/
├── index.ts                          # 클럽 목록
├── [id]/
│   ├── phone-verification/           # 휴대폰 인증
│   ├── board/posts/, categories/     # 게시판
│   ├── guests/[guestId]/             # 게스트 관리
│   └── membership-fee/              # 회비 정산 (dashboard, payments 등)
```

### 비즈니스 로직 분리

순수 로직은 `src/lib/` 아래에 분리. 특히 회비 정산 관련 로직은 `src/lib/membership-fee/`에 모듈별로 분리 (feeObligation, memberMatcher, monthSuggester, excelParser 등).

## Prisma 스키마 규칙

- **`prisma/schema.prisma`는 생성 파일** — 직접 수정 금지
- 모델 추가/수정은 `prisma/schema/` 폴더의 개별 `.prisma` 파일에서 수행
- 변경 후 반드시 `pnpm run build:schema` 실행
- 새 파일 추가 시 `prisma/build-schema.ts`의 `schemaFiles` 배열에 등록 (의존성 순서 고려)
- 관계 추가 시 양쪽 모델 모두에 relation 필드 추가

## 코딩 컨벤션

- 함수형 컴포넌트 + Hooks 사용
- 이벤트 핸들러: `on` 접두사 (onClick, onChange, onSubmit)
- export는 파일 하단에 분리 (`export default` 사용, 선언부에서 직접 export 금지)
- early return 패턴 권장
- TypeScript strict 모드
- 들여쓰기 2칸, 최대 줄 길이 100자

## 커밋 메시지 / PR 규칙

- Conventional Commits 형식: `feat(scope):`, `fix(scope):`, `docs(scope):` 등
- 본문에 **배경(Why)** → **작업(What)** 순서로 작성 (버그 시 **원인** 추가)
- 한글로 작성

## 데이터베이스 주요 엔티티

- **User/ClubMember**: 사용자 및 클럽 회원
- **Club**: 클럽 설정
- **GuestPost**: 게스트 신청 (GUEST_REQUEST, INQUIRY_REQUEST, JOIN_INQUIRY_REQUEST)
- **Post/PostCategory**: 게시판
- **Workout/WorkoutParticipant**: 운동 일정
- **MemberLeave**: 휴회/병가 기간
- **FeeType/FeeRate/MembershipPayment/FeeExemption**: 회비 정산
- **SmsNotificationLog**: SMS 발송 이력

## 참고 문서

`docs/` 폴더에 기능별 상세 문서 있음 (게스트 신청, SMS, 휴대폰 인증, 회비 정산 등)

## 작업별 룰 (`.claude/rules/`)

특정 패턴의 작업을 시작할 때 해당 룰 문서를 먼저 읽고 따른다.

- API 핸들러 추가/수정 시 → `.claude/rules/api-handler-conventions.md` (Prisma 싱글톤, 핸들러 보일러플레이트, 응답 포맷)
- 일괄 처리 API 추가 시 → `.claude/rules/bulk-action-pattern.md`

## 문서화 정책

기능 변경은 **화면 단위와 기능 단위로 분리**해 문서화한다.

### 폴더 구조

화면 단위로 폴더를 만들고, 그 안에 두 종류의 문서를 둔다.

```
docs/<도메인>/<화면 단위>/
├── README.md                   # 폴더 진입점 (인덱스)
├── <화면>-컨텍스트.md           # 화면 단위 — 지금의 모습
└── 기능/                        # 기능 단위 — 변경 이력
    └── <기능명>.md
```

### 두 문서의 역할

| 구분          | 역할                                                           | 갱신 정책                                  |
| ------------- | -------------------------------------------------------------- | ------------------------------------------ |
| 화면 컨텍스트 | 지금의 아키텍처·기능 매핑·플로우                               | 변경마다 갱신                              |
| 기능 단위     | 왜·어떻게 그 결정이 됐는지 (배경/Why → 작업/What → 의사결정)   | 시점 기록, 후속 변경은 새 문서로 누적      |

### 새 기능 도입 시 워크플로

1. `기능/` 하위에 새 기능 문서 작성 (배경 → 도입한 개선 → 설계 의사결정 → 백엔드/프런트 처리 → UX 디테일 → 검증 → 변경 이력)
2. 화면 컨텍스트 문서의 관련 섹션 갱신 + 새 기능 문서로 가는 링크 추가
3. 기능 문서 간 상호 참조는 `./파일.md` 상대 경로 사용

### 예시

`docs/회비 정산/입금 내역 처리/` 참고.
