# DB 쿼리 지연 가능 요소 검토

검토일: 2025-03 기준  
목적: 간헐적 500ms+ 지연 또는 향후 데이터 증가 시 느려질 수 있는 쿼리 요소 정리.

---

## 1. 높은 영향 (우선 개선 권장)

### 1-1. 운동 목록 API – N+1 패턴

**위치:** `src/pages/api/clubs/[id]/workouts.ts`

**문제:**  
`workout.findMany()`로 운동 목록을 가져온 뒤, **운동 개수만큼** 루프 안에서 `guestPost.findMany()`를 각각 호출합니다.

```ts
const workouts = await prisma.workout.findMany({ ... });
const workoutsWithGuests = await Promise.all(
  workouts.map(async (workout) => {
    const guests = await prisma.guestPost.findMany({
      where: { clubId, status: 'APPROVED', visitDate: workoutDate },
      ...
    });
    return { ...workout, guests, guestCount: guests.length };
  })
);
```

- 운동이 10개면 게스트 조회가 **10번** 추가로 실행됩니다.
- 동시 요청이 많아지면 DB 부하와 응답 시간이 쉽게 늘어납니다.

**개선 방향:**

- 한 번에 해당 클럽·기간의 승인 게스트를 `visitDate` 기준으로 모두 조회한 뒤, 메모리에서 `visitDate`별로 그룹핑하여 각 workout에 매핑.
- 또는 `workout.date` 목록을 IN 조건으로 두고, 게스트 쿼리 1번 + 그룹핑으로 처리.

---

### 1-2. Workout 테이블 인덱스 없음

**위치:** `prisma/schema/workout.prisma` (또는 `schema.prisma`의 Workout 모델)

**문제:**  
`workouts.ts`에서 다음 조건으로 조회하는데, Workout 모델에 **인덱스가 없습니다.**

- `where: { clubId: Number(id), startTime: { gte: today, lte: sevenDaysLater } }`
- `orderBy: { date: 'asc' }`

데이터가 많아지면 `clubId` + `startTime` 범위 스캔이 매번 풀스캔에 가깝게 동작할 수 있습니다.

**개선 방향:**  
복합 인덱스 추가 (빌드 규칙에 따라 `prisma/schema/workout.prisma`에 추가 후 `pnpm run build:schema` 실행).

```prisma
model Workout {
  ...
  @@index([clubId])
  @@index([clubId, startTime])
}
```

---

## 2. 중간 영향 (데이터/트래픽 증가 시 점검)

### 2-1. 게스트 목록 API – include 전체

**위치:** `src/pages/api/clubs/[id]/guests/index.ts`

**문제:**  
`include: { clubMember: true }` 로 **ClubMember 전체 컬럼**을 가져옵니다. 목록에서는 보통 작성자 이름 등 일부만 필요합니다.

- 전송 데이터량 증가.
- JOIN/선택 컬럼이 많아져 쿼리 비용이 조금씩 늘어날 수 있습니다.

**개선 방향:**  
`select`로 필요한 필드만 지정 (예: `clubMember: { select: { name: true } }` 또는 목록에 필요한 최소 필드만).

---

### 2-2. ClubMember – findFirst + userId 단일 조건

**위치:**  
`src/pages/api/users/me/member-info.ts` 등 여러 API

**문제:**

- `findFirst({ where: { userId: req.user.id } })` 처럼 **userId만**으로 조회하는 경우가 있습니다.
- ClubMember에는 `@@unique([clubId, userId])` 만 있고, **userId 단독 인덱스는 없습니다.**
- 한 사용자가 여러 클럽에 가입할 수 있으므로, userId만 조건이면 unique 인덱스를 완전히 활용하지 못하고 스캔 범위가 넓어질 수 있습니다.

**개선 방향:**

- “특정 클럽”이 정해진 API는 `findUnique({ where: { clubId_userId: { clubId, userId } } })` 사용.
- “내가 속한 클럽 중 하나”처럼 clubId가 없이 userId만 필요한 API는, 트래픽/데이터가 늘면 `@@index([userId])` 추가 검토.

---

### 2-3. GuestPost – status / visitDate 조건

**위치:**  
`src/pages/api/clubs/[id]/workouts.ts`  
`where: { clubId, status: 'APPROVED', visitDate: workoutDate }`

**현재 인덱스:**  
GuestPost: `@@index([clubId])`, `@@index([userId])`, `@@index([createdBy])`

**문제:**

- `(clubId, status, visitDate)` 복합 조건인데, 이에 맞는 복합 인덱스가 없습니다.
- clubId 인덱스만으로 1차 필터 후, status·visitDate는 추가 필터로 처리됩니다. 데이터가 많아지면 선택도가 나쁠 수 있습니다.

**개선 방향:**  
운동 목록·게스트 집계가 자주 쓰이면 복합 인덱스 추가 검토 (스키마 규칙에 따라 `prisma/schema/guest.prisma` 등에 추가).

```prisma
@@index([clubId, status, visitDate])
```

---

## 3. 기타 (참고)

### 3-1. ClubMember (userId, clubId) 조회 시 findUnique 활용

**위치:**  
`board/categories/index.ts`, `board/posts/.../comments/.../like.ts` 등

**내용:**  
`findFirst({ where: { userId, clubId } })` 대신  
`findUnique({ where: { clubId_userId: { clubId, userId } } })` 를 쓰면 unique 인덱스를 정확히 타서 약간의 이득이 있을 수 있습니다.  
동작은 동일하므로 리팩터 시 함께 적용하면 좋습니다.

### 3-2. getServerSideProps / Prisma 클라이언트

**조치 완료:**  
게스트 상세 페이지(`[guestId]/index.tsx`) getServerSideProps에서는 이미

- 매 요청 `new PrismaClient()` 제거
- `@/lib/prisma` 싱글톤 사용
- `select`로 필요 필드만 조회  
  으로 정리된 상태입니다.

---

## 요약

| 구분 | 항목                                  | 영향                          | 권장 조치                                                |
| ---- | ------------------------------------- | ----------------------------- | -------------------------------------------------------- |
| 높음 | workouts API N+1                      | 요청 시 운동 수만큼 추가 쿼리 | 게스트 1회 조회 후 메모리 그룹핑                         |
| 높음 | Workout 인덱스 없음                   | 기간/클럽 조건 풀스캔 가능    | `@@index([clubId])`, `@@index([clubId, startTime])` 추가 |
| 중간 | guests 목록 include 전체              | 데이터량·JOIN 비용 증가       | clubMember는 select로 필요한 필드만                      |
| 중간 | ClubMember userId 단독 조회           | unique 미활용, 스캔 범위 증가 | 필요 시 findUnique 활용 또는 @@index([userId]) 검토      |
| 중간 | GuestPost (clubId, status, visitDate) | 조건에 맞는 인덱스 없음       | 사용 패턴 확인 후 복합 인덱스 검토                       |

규칙: Prisma 스키마 수정은 `prisma/schema/` 내 해당 도메인 `.prisma` 파일에서 하고, `pnpm run build:schema` 실행 후 마이그레이션 적용.
