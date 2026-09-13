# 게스트 상세 페이지 로딩이 간헐적으로 500ms 넘는 문제 — 원인과 해결

게스트 검사 목록에서 행을 클릭해 상세 페이지로 이동할 때, 데이터 요청(`_next/data/...`)이 **간헐적으로 500ms를 넘는** 현상이 있었다. 원인 분석과 적용한 해결 방법을 정리한 글이다.

---

## 1. 현상

- **어디서:** 게스트 검사 페이지(`/clubs/[id]/guest/check`)에서 행 클릭 → 게스트 상세 페이지(`/clubs/[id]/guest/[guestId]`)로 이동
- **무엇이:** Next.js가 상세 페이지 데이터를 가져오기 위해 호출하는 요청이 느려짐
  - 예: `http://localhost:3000/_next/data/development/clubs/1/guest/{guestId}.json?id=1&guestId={guestId}`
- **특징:** 항상 느린 것이 아니라 **간헐적으로** 500ms를 넘김

행 클릭 시 실행되는 코드는 단순히 라우팅만 한다.

```tsx
// src/pages/clubs/[id]/guest/check/index.tsx (55-57)

const handleRowClick = (guestId: string) => {
  router.push(`/clubs/${clubId}/guest/${guestId}`);
};
```

`router.push`가 내부적으로 위 `_next/data/...` 요청을 보내고, 이 요청을 처리하는 쪽에서 지연이 발생하고 있었다.

---

## 2. 원인

`_next/data/...` 요청은 해당 페이지의 **getServerSideProps**를 서버에서 실행한 결과를 JSON으로 돌려주는 요청이다.  
즉, **게스트 상세 페이지의 getServerSideProps**가 느려지면 전체 응답 시간이 500ms를 넘기 쉽다.

### 2-1. 매 요청마다 새 PrismaClient 생성 (주요 원인)

기존에는 getServerSideProps 안에서 **요청마다** `new PrismaClient()`를 호출하고 있었다.

```tsx
// 변경 전 (문제 있던 코드)

export const getServerSideProps = async (context: any) => {
  const { guestId } = context.params;

  const prisma = new PrismaClient(); // ← 매 요청마다 새 인스턴스
  const guestPost = await prisma.guestPost.findUnique({
    where: { id: guestId },
    include: {
      clubMember: { select: { name: true } },
    },
  });
  // ...
};
```

- PrismaClient를 요청마다 새로 만들면, 그때마다 **DB 연결/커넥션 풀**이 새로 잡히거나 비용이 든다.
- 트래픽이 조금만 있어도, 또는 서버/DB 상태에 따라 **간헐적으로** 응답 시간이 500ms를 넘길 수 있다.

### 2-2. 쿼리에서 불필요한 컬럼까지 조회

- `include`만 쓰고 `select`로 필드를 제한하지 않으면, 테이블의 **전체 컬럼**을 가져오게 된다.
- 전송·직렬화 비용이 조금씩 늘어나고, 데이터가 커질수록 체감될 수 있다.

---

## 3. 해결 방법

### 3-1. Prisma 싱글톤 사용

프로젝트에는 이미 **서버에서 Prisma 인스턴스를 재사용**하는 모듈이 있다.

```ts
// src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

getServerSideProps에서는 **이 인스턴스를 import해서 사용**하도록 바꾼다.

```tsx
// 변경 후

import { prisma } from '@/lib/prisma';

export const getServerSideProps = async (context: any) => {
  const guestId = context.params?.guestId;
  const id =
    typeof guestId === 'string'
      ? guestId
      : Array.isArray(guestId)
        ? guestId[0]
        : undefined;
  if (!id) {
    return { notFound: true };
  }

  try {
    const guestPost = await prisma.guestPost.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        birthDate: true,
        phoneNumber: true,
        gender: true,
        localTournamentLevel: true,
        nationalTournamentLevel: true,
        lessonPeriod: true,
        playingPeriod: true,
        status: true,
        intendToJoin: true,
        visitDate: true,
        message: true,
        createdAt: true,
        userId: true,
        createdBy: true,
        clubMember: {
          select: { name: true },
        },
      },
    });
    // ...
  }
};
```

- **효과:** 요청마다 새 PrismaClient를 만들지 않아, 연결/풀 비용이 줄어들고 간헐적 지연이 줄어든다.

### 3-2. select로 필요한 필드만 조회

- `include`만 쓰던 부분을 **`select`** 로 바꿔, 페이지에서 실제로 쓰는 필드만 명시했다.
- 위 코드처럼 `guestPost`와 `clubMember.name`만 가져오면, 전송·직렬화 부담이 줄어든다.

### 3-3. params 안전 처리 (선택)

- Next.js에서 `context.params`가 없거나 `guestId`가 배열로 올 수 있어, Prisma에 넘기기 전에 **문자열 하나로 보정**했다.
- `id`가 없으면 `notFound: true`를 반환해, 잘못된 요청에서도 에러 대신 404로 처리한다.

---

## 4. 정리

| 구분   | 변경 전                                                | 변경 후                                        |
| ------ | ------------------------------------------------------ | ---------------------------------------------- |
| Prisma | getServerSideProps 안에서 `new PrismaClient()` 매 요청 | `@/lib/prisma` 싱글톤 사용                     |
| 쿼리   | `include` 위주, 전체 컬럼 가능성                       | `select`로 필요한 필드만 조회                  |
| params | `context.params.guestId` 그대로 사용                   | 문자열/배열 보정 후 `id` 사용, 없으면 notFound |

**한 줄 요약:** 게스트 상세의 getServerSideProps에서 **매 요청마다 새 PrismaClient를 만들던 것**을 **싱글톤 + select 최소 조회**로 바꿔, 간헐적으로 500ms를 넘기던 현상을 줄였다.
