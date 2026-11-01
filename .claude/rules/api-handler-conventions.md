# API 핸들러 작성 규칙

`src/pages/api/` 아래의 Next.js API 핸들러를 새로 추가하거나 수정할 때 따르는 규칙. 세 가지 영역으로 나뉘며, 어기면 운영 사고 또는 프런트와의 호환성 문제로 이어진다.

1. [Prisma 클라이언트 import](#1-prisma-클라이언트-import)
2. [핸들러 보일러플레이트](#2-핸들러-보일러플레이트)
3. [응답 포맷](#3-응답-포맷)

---

## 1. Prisma 클라이언트 import

### 규칙

```ts
import { prisma } from '@/lib/prisma';
```

**이게 유일한 정답.** 다른 import 형태나 자체 인스턴스 생성은 모두 금지.

### 금지 패턴

```ts
// ❌ 금지 — 핸들러마다 새 인스턴스가 생성되어 dev HMR 시 커넥션 누수
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ❌ 금지 — 같은 이유
const client = new PrismaClient();
```

### 왜

`src/lib/prisma.ts`는 **싱글톤 패턴**으로 `PrismaClient`를 한 번만 생성하고 `globalThis`에 캐싱한다. Next.js dev 서버는 HMR로 모듈을 다시 로드하는데, 이때 매번 새 `PrismaClient`가 만들어지면 DB 커넥션이 누수되어 결국 풀이 고갈된다.

이 패턴이 정착된 사고 기록:

- `8de3ebd` fix: 게시판 API PrismaClient 초기화 오류 수정
- `a18ac1e` perf(prisma): lib·게스트 상세에서 Prisma 싱글톤 사용으로 응답 지연 완화

### 허용 예외

타입만 가져오거나 실행 컨텍스트가 다른 경우는 예외다.

| 위치                                       | 패턴                                            | 이유                          |
| ------------------------------------------ | ----------------------------------------------- | ----------------------------- |
| `src/scripts/migrate.ts` 같은 일회성 스크립트 | `new PrismaClient()` 직접 생성 후 `$disconnect` | API 핸들러가 아닌 별도 프로세스 |
| `*.test.ts`                                | `import { PrismaClient } ... mockImplementation` | Jest mock                     |
| 타입만 필요한 곳                            | `import type { PrismaClient } from '@prisma/client'` | 인스턴스 생성 안 함           |

### 체크리스트

- [ ] `import { prisma } from '@/lib/prisma'` 한 줄만 있다
- [ ] `new PrismaClient()` 호출이 핸들러/lib에 없다 (스크립트/테스트 제외)
- [ ] `import { PrismaClient }`가 있다면 `import type`이거나 테스트 파일이다

---

## 2. 핸들러 보일러플레이트

### 규칙

모든 인증된 API 핸들러는 다음 7단계 순서를 따른다.

```ts
import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';
// (필요 시) import { someSchema } from '@/schemas/...';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  // 1) 메소드 가드
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  // 2) path param 검증
  const { id: clubId } = req.query;
  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }
  const clubIdNumber = Number(clubId);

  // 3) 권한 검증 (관리자 전용 API의 경우)
  const adminMember = await prisma.clubMember.findFirst({
    where: { userId: req.user.id, clubId: clubIdNumber, role: Role.ADMIN },
  });
  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  try {
    // 4) 입력 스키마 검증 (zod safeParse)
    // 5) DB 조회 / 비즈니스 로직
    // 6) DB 변경 (필요 시 트랜잭션)
    // 7) 200 응답
    return res.status(200).json({ data: { ... }, status: 200, message: '...' });
  } catch (error) {
    console.error('Error in <handler>:', error);
    return res.status(500).json({
      error: '처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
```

### 핵심 포인트

- **`withAuth` 래핑**: `src/lib/session.ts`의 `withAuth`로 감싸 인증된 사용자만 통과하도록 한다. `req.user.id`는 이 단계 통과 후 보장됨.
- **메소드 가드 → path param → 권한** 순서: 비싼 DB 호출(권한 검증) 전에 값싼 검증을 먼저 한다.
- **권한 검증은 `Role.ADMIN`** 으로 `prisma.clubMember.findFirst` — 관리자 전용 API의 표준 패턴.
- **입력 검증은 zod `safeParse`** — `parseResult.success` 체크 후 `parseResult.error.errors[0].message`를 그대로 클라이언트에 노출 (한국어로 작성된 zod 메시지가 사용자에게 보여짐).
- **try/catch는 비즈니스 로직만 감싼다** — 메소드 가드/path param/권한 검증은 try 밖. catch는 `console.error` + 500 응답.

### 체크리스트

- [ ] `withAuth(async function handler(...))` 형태
- [ ] 메소드 가드가 첫 번째
- [ ] clubId(또는 다른 path param) 검증이 두 번째
- [ ] 관리자 전용이면 `Role.ADMIN` 권한 검증
- [ ] 입력 스키마는 zod `safeParse` 사용, 에러 메시지는 `errors[0].message`
- [ ] try/catch는 비즈니스 로직만, catch에서 `console.error` + 500

---

## 3. 응답 포맷

### 규칙

모든 응답은 다음 두 형태 중 하나여야 한다.

**성공:**

```ts
{
  data: { ... },        // 응답 본문
  status: 200,          // HTTP status와 동일한 숫자
  message: string,      // 사용자에게 보여줄 한국어 메시지
}
```

**실패:**

```ts
{
  error: string,        // 사용자에게 보여줄 한국어 메시지
  status: number,       // HTTP status와 동일 (400/403/404/405/500)
}
```

### 왜 이 형태인가

- **프런트의 axios 훅이 일관된 분기를 한다.** `useBulkUnconfirmPayments` 등 거의 모든 훅이 `if (response.data.status !== 200) throw new Error(response.data.message)` 패턴. 이 형식을 어기면 프런트 훅 전체가 깨진다.
- 에러 시 `error` 필드가 표준이라, `axios.isAxiosError(err) && err.response?.data?.error` 한 줄로 사용자 메시지를 추출할 수 있다.

### 부분 성공 (일괄 처리 API)

여러 record를 처리하는 일괄 API는 부분 성공이 정상 흐름이라 항상 200으로 떨어뜨리고 `data.results`에 성공/실패를 누적한다. 자세한 형식은 [`bulk-action-pattern.md`](./bulk-action-pattern.md) 참조.

### 체크리스트

- [ ] 200 응답은 `{ data, status: 200, message }` 형식
- [ ] 4xx/5xx 응답은 `{ error, status }` 형식
- [ ] `status` 필드의 숫자가 HTTP status와 일치
- [ ] 메시지는 한국어, 사용자가 바로 이해 가능한 짧은 문장

---

## 참고 구현

가장 깔끔한 표준 예시:

- `src/pages/api/clubs/[id]/membership-fee/records/[recordId]/skip.ts` — 단건 액션
- `src/pages/api/clubs/[id]/membership-fee/records/bulk-unconfirm.ts` — 일괄 액션
- `src/pages/api/clubs/[id]/membership-fee/records/index.ts` — GET 리스트

싱글톤 정의: `src/lib/prisma.ts`
인증 래퍼 정의: `src/lib/session.ts`
