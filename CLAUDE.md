# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

배드민턴 클럽 커뮤니케이션 플랫폼 - 클럽 관리, 운동 일정, 게스트 신청, 게시판, SMS 알림 기능을 제공하는 Next.js 풀스택 웹앱

## 주요 명령어

```bash
pnpm dev                    # 개발 서버 (localhost:3000)
pnpm build                  # 프로덕션 빌드
pnpm test                   # Jest 테스트
pnpm test:watch             # Watch 모드 테스트
pnpm lint                   # ESLint 검사
npx prisma migrate dev      # DB 마이그레이션
npx prisma generate         # Prisma 클라이언트 생성
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
│   └── guests/[guestId]/             # 게스트 관리
```

## 코딩 컨벤션

- 함수형 컴포넌트 + Hooks 사용
- 이벤트 핸들러: `on` 접두사 (onClick, onChange, onSubmit)
- export는 파일 하단에 분리
- early return 패턴 권장
- TypeScript strict 모드
- 들여쓰기 2칸, 최대 줄 길이 100자

## 데이터베이스 주요 엔티티

- **User/ClubMember**: 사용자 및 클럽 회원
- **Club**: 클럽 설정
- **GuestPost**: 게스트 신청 (GUEST_REQUEST, INQUIRY_REQUEST, JOIN_INQUIRY_REQUEST)
- **Post/PostCategory**: 게시판
- **Workout/WorkoutParticipant**: 운동 일정
- **SmsNotificationLog**: SMS 발송 이력

## 참고 문서

`docs/` 폴더에 기능별 상세 문서 있음 (게스트 신청, SMS, 휴대폰 인증 등)