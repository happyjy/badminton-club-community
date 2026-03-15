# 게스트 상세·API 응답 지연 개선

## 배경 (Why)

- 게스트 검사 목록에서 행 클릭 시 상세 페이지로 이동할 때, **간헐적으로 500ms를 넘는** 지연이 발생함.
- 원인: 게스트 상세 페이지의 `getServerSideProps`에서 **요청마다 `new PrismaClient()`** 를 호출해, 연결/풀 비용이 누적되며 간헐적 지연이 발생함.
- 추가로 DB 쿼리 검토 결과, **운동 목록 API N+1**, **게스트 목록 API의 전체 `clubMember` include**, **lib별 Prisma 인스턴스 분리** 등이 응답 지연·리소스 비효율 요인으로 확인됨.

## 작업 내용 (What)

### 1. 게스트 상세 페이지 SSR (getServerSideProps)

- **Prisma 싱글톤 사용:** `new PrismaClient()` 제거, `@/lib/prisma` 사용 → 커넥션 풀 재사용.
- **쿼리 최소화:** `select`로 필요한 필드만 명시해 조회·직렬화 비용 감소.
- **params 안전 처리:** `context.params?.guestId` 문자열/배열 보정 후 사용, 없으면 `notFound` 반환.

### 2. 운동 목록 API (`/api/clubs/[id]/workouts`)

- **N+1 제거:** 운동별로 `guestPost.findMany` 반복 호출하던 부분 제거.
- **1회 조회 후 그룹핑:** 해당 기간의 `visitDate` 목록으로 게스트를 한 번만 조회한 뒤, 메모리에서 `visitDate`별로 그룹 지어 각 workout에 매핑.

### 3. 게스트 목록 API (`/api/clubs/[id]/guests`)

- **include → select:** `include: { clubMember: true }` 제거, `select`로 필요한 필드만 명시.
- **clubMember:** 목록 표시용으로 `name`만 조회 (`clubMember: { select: { name: true } }`).

### 4. lib Prisma 싱글톤 통일

- **email, sms-notification, sms-verification:** 모듈 내 `new PrismaClient()` 제거, `@/lib/prisma` 사용.
- API 요청 시 동일 커넥션 풀 사용으로 연결 비용·간헐적 지연 완화.

### 5. 타입 정리

- **GuestPostForList:** 목록 API가 실제로 반환하는 형태(`clubMember: { name } | null`)에 맞는 타입 추가.
- **GuestListResponse:** `items` 타입을 `GuestPostForList[]`로 변경해 API 반환값과 일치시킴.

### 6. 문서

- `docs/dev-blog-게스트-상세-500ms-지연-원인과-해결.md`: 원인 분석 및 해결 방법 정리.
- `docs/DB-쿼리-지연-요소-검토.md`: DB 쿼리 지연 가능 요소 검토.
- `docs/dev-blog-getServerSideProps-vs-client-fetch.md`: getServerSideProps vs 클라이언트 fetch 차이 정리.

---

## 변경 파일 요약

| 구분 | 파일 |
|------|------|
| SSR | `src/pages/clubs/[id]/guest/[guestId]/index.tsx` |
| API | `src/pages/api/clubs/[id]/workouts.ts`, `src/pages/api/clubs/[id]/guests/index.ts` |
| lib | `src/lib/email.ts`, `src/lib/sms-notification.ts`, `src/lib/sms-verification.ts` |
| 타입 | `src/types/guest.types.ts` |
| 문서 | `docs/` 내 dev-blog, DB 쿼리 검토 문서 |

---

## 체크리스트

- [ ] 게스트 검사 목록 → 상세 이동 시 체감 지연이 줄었는지 확인
- [ ] 운동 목록(출석/참석 인원) API 응답 정상 여부 확인
- [ ] 게스트 목록 API 응답 및 목록 화면(작성자명 등) 정상 여부 확인
