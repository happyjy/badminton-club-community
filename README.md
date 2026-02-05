# Badminton Club Communication Platform

배드민턴 클럽 회원 간 소통을 위한 웹 플랫폼입니다.

## 주요 기능

### 🚀 핵심 기능

- 클럽 가입 및 관리
- 운동 일정 생성 및 참여
- 게스트 신청 및 승인/거절
- 회원 랭킹 시스템

### 📱 SMS 알림 시스템 (신규 구현)

- **게스트 신청 상태 업데이트 알림**: 승인/거절 시 작성자에게 자동 SMS 전송
- **댓글 알림**: 다른 사람이 댓글 작성 시 게시글 작성자에게 자동 SMS 전송
- **중복 전송 방지**: 각 알림 타입별로 최초 1회만 전송
- **전송 이력 관리**: 모든 SMS 전송 내역을 데이터베이스에 기록

#### SMS 알림 동작 방식

1. **상태 업데이트 알림**
   - 게스트 신청 상태가 `PENDING` → `APPROVED` 또는 `REJECTED`로 변경될 때
   - 해당 게시글 작성자에게 최초 1회만 SMS 전송

2. **댓글 알림**
   - 게스트 신청 게시글에 다른 사람이 댓글을 작성할 때
   - 게시글 작성자에게 최초 1회만 SMS 전송

#### 기술적 특징

- Prisma를 사용한 데이터베이스 스키마 설계
- TypeScript로 타입 안전성 보장
- React Hook을 통한 상태 관리
- API 엔드포인트를 통한 서버 통신
- 단위 테스트를 통한 코드 품질 보장

## 기술 스택

### Frontend

- **Framework**: Next.js 14, React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: Redux Toolkit
- **Form Management**: React Hook Form, Zod

### Backend

- **Database**: PostgreSQL
- **ORM**: Prisma
- **API**: Next.js API Routes
- **Authentication**: NextAuth.js

### Development Tools

- **Package Manager**: pnpm
- **Linting**: ESLint, Prettier
- **Testing**: Jest, React Testing Library
- **Git Hooks**: Husky, lint-staged

## 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── atoms/          # 기본 UI 컴포넌트
│   ├── molecules/      # 복합 컴포넌트
│   └── organisms/      # 큰 단위 컴포넌트
├── hooks/              # Custom React Hooks
├── lib/                # 유틸리티 및 서비스
├── pages/              # Next.js 페이지 및 API
├── types/              # TypeScript 타입 정의
└── utils/              # 헬퍼 함수들
```

## 설치 및 실행

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
# .env.local 파일에 필요한 환경 변수 설정
```

### 3. 데이터베이스 마이그레이션

```bash
npx prisma migrate dev
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

## API 엔드포인트

### SMS 알림 관련 API

- `GET /api/clubs/[clubId]/guests/[guestId]/sms-status` - SMS 전송 상태 조회
- `POST /api/clubs/[clubId]/guests/[guestId]/send-sms` - SMS 전송 실행
- `PATCH /api/clubs/[clubId]/guests/[guestId]/status` - 게스트 신청 상태 업데이트 (SMS 자동 전송)
- `POST /api/clubs/[clubId]/guests/[guestId]/comments` - 댓글 추가 (SMS 자동 전송)

## 테스트

### 단위 테스트 실행

```bash
pnpm test
```

### 테스트 커버리지 확인

```bash
pnpm test:coverage
```

## 배포

### Vercel 배포

```bash
pnpm build
pnpm start
```

## 기여 가이드

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 연락처

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.
