# 인증번호가 발송되지 않는 문제 수정

커밋 `8e2501b`. 테스트 중 "인증번호가 안 오는 케이스가 있다"는 제보에서 출발했다.

## 배경 (Why)

전화번호 인증 기록이 **두 곳에 서로 다른 범위로** 저장된다.

| 저장 위치                              | 범위          | 용도                 |
| -------------------------------------- | ------------- | -------------------- |
| `User.phoneNumber` + `phoneVerifiedAt` | 계정에 하나   | 계정이 인증한 번호   |
| `PhoneVerification`                    | 클럽별로 따로 | 클럽마다의 인증 기록 |

`PhoneVerification`은 `@@unique([userId, clubId, phoneNumber])`로 클럽별로 쪼개져 있다.
반면 `User.phoneNumber`는 계정에 칸이 하나뿐이다. **이 둘을 판정에 섞어 쓴 것이 원인이다.**

### 사고 시나리오

실제로 재현된 순서다.

**1단계.** 클럽 1에서 `010-6636-8962`를 인증했다 (2025-08-24). `PhoneVerification` 38번
행이 `clubId: 1`, `isVerified: true`로 남았다.

**2단계.** 클럽 2에서 `010-3376-2668`을 인증했다 (2026-09-12). 이때 `verifyCode`가
`User.phoneNumber`를 **덮어썼다.**

```ts
// verifyCode 끝부분. clubId를 인자로 받아 놓고 이 갱신에는 쓰지 않는다.
await prisma.user.update({
  where: { id: userId },
  data: { phoneNumber, phoneVerifiedAt: new Date() },
});
```

계정에 번호 칸이 하나뿐이라 **마지막에 인증한 클럽의 번호가 계정 전체를 차지한다.**
`User.phoneVerifiedAt`과 PV 245번의 `verifiedAt`이 24밀리초 차이라는 점으로 확인했다.

**3단계.** 클럽 1로 돌아와 `010-6636-8962`로 신청했다. 여기서 서버와 화면이 엇갈린다.

| 주체          | 보는 기록                         | 판단                          |
| ------------- | --------------------------------- | ----------------------------- |
| 서버 (`send`) | 클럽 1의 옛 기록(PV 38)을 찾음    | 이미 인증됨. **문자 안 보냄** |
| 화면          | 계정 번호(`010-3376-2668`)와 비교 | 미인증. 인증 절차 시작        |

서버는 문자를 보내지 않았는데 화면은 인증번호 입력칸을 열었다.
**오지 않는 문자를 기다리는 상태**가 된다. 이것이 제보된 증상이다.

### 원인 1. 판정이 계정과 클럽으로 갈려 있었다

`checkPreviouslyVerifiedPhone`은 `User`를 먼저 보고, 실패하면 `PhoneVerification`을
보는 **OR 조건**이었다. 둘 중 하나만 걸려도 통과한다.

```ts
if (user?.phoneNumber === phoneNumber && user?.phoneVerifiedAt) {
  return true;
}

const verification = await prisma.phoneVerification.findFirst({
  where: {
    userId,
    clubId,
    phoneNumber,
    isVerified: true,
    verifiedAt: { not: null },
  },
});

return !!verification;
```

두 번째 조회에 `expiresAt` 조건이 없다. 그래서 **1년 전에 만료된 행도 영구 면제권으로
작동한다.** 클럽 1의 PV 38번이 여기 걸려 발송을 막았다.

한편 `status` API는 `User`만 본다. 화면은 이 응답으로 판정하므로 서버와 기준이 다르다.

```ts
// status.ts — clubId를 쿼리로 받으면서 정작 User만 조회한다.
const isVerified = !!(user.phoneNumber && user.phoneVerifiedAt);
```

### 원인 2. 번호 비교가 형식에 민감했다

1차 판정이 `===` 정확 일치였다. 계정 인증 사용자 158명 중 **9명이 하이픈 없이** 저장돼
있어, 이들은 같은 번호를 입력해도 재인증 대상이 됐다.

화면(`PhoneField`)은 이미 `toPhoneDigits`로 양쪽을 정규화해 비교하고 있었다.
**서버만 기준이 달랐다.**

### 원인 3. 화면이 서버 응답을 확인하지 않았다

서버는 발송을 건너뛸 때 `canSkipVerification: true`로 알려준다. 그런데 화면은
응답을 보지 않고 입력칸을 열었다.

```ts
await sendPhoneVerificationCode(fullPhoneNumber);
setSentTo(fullPhoneNumber); // 응답과 무관하게 실행된다
```

`success: true`로 돌아오므로 클라이언트는 발송에 성공한 줄 안다.

### 클럽별 인증은 애초에 성립하지 않는다

"클럽마다 다시 인증"을 의도했다 해도 **저장할 곳이 없다.** `verifyCode`가 매번
`User.phoneNumber`를 덮어쓰고, 계정에 번호 칸은 하나뿐이다. 구조가 이미 계정 단위다.

---

## 작업 내용 (What)

### 1. 판정 근거를 계정으로 모음 (`src/lib/sms-verification.ts`)

인증은 "이 번호가 이 사람 것인지" 확인하는 절차이고, 그 사실은 클럽과 무관하다.
`PhoneVerification` 조회를 판정에서 빼고, 쓰이지 않게 된 `clubId` 인자도 제거했다.

```ts
export async function checkPreviouslyVerifiedPhone(
  userId: number,
  phoneNumber: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.phoneVerifiedAt) return false;

  const verifiedDigits = toPhoneDigits(user.phoneNumber);

  // 빈 값끼리 같다고 판정되지 않도록 번호가 있을 때만 비교한다.
  if (!verifiedDigits) return false;

  return verifiedDigits === toPhoneDigits(phoneNumber);
}
```

`PhoneVerification`은 **발송 이력 보관용으로만 남는다.** 옛 클럽의 기록이 면제권으로
작동하지 않으므로, 만료를 보지 않던 문제도 함께 사라진다.

### 2. 번호 비교 정규화

화면이 쓰는 `toPhoneDigits`를 서버도 쓰게 해 기준을 맞췄다. **DB 값은 고치지 않고
비교 방식만 바꿨다.** 하이픈 없이 저장된 9명이 불필요하게 재인증하지 않는다.

### 3. 호출부 수정 (`send.ts`)

`clubId` 인자를 뺐다. 로직 변경은 없다.

### 4. 발송을 건너뛴 응답 처리 (`PhoneField.tsx`)

`canSkipVerification`이 참이면 입력칸을 열지 않고 인증 완료로 처리한다.
번호가 계정 인증 번호와 같으면 화면이 애초에 인증 버튼을 숨기지만, 형식 차이나
상태 지연으로 어긋날 때를 대비한 안전장치다.

```ts
const result = await sendPhoneVerificationCode(fullPhoneNumber);

if (result?.canSkipVerification) {
  setVerifiedNumber(fullPhoneNumber);
  setSentTo(null);
  await checkPhoneVerificationStatus?.();
  return;
}

setSentTo(fullPhoneNumber);
```

---

## 변경 파일 요약

| 파일                                           | 변경                                             |
| ---------------------------------------------- | ------------------------------------------------ |
| `src/lib/sms-verification.ts`                  | 판정을 계정 기준으로, 비교 정규화, `clubId` 제거 |
| `src/lib/sms-verification.test.ts`             | 신규. 판정 로직 테스트 8개                       |
| `src/pages/api/.../phone-verification/send.ts` | 호출부 인자 수정                                 |
| `PhoneField.tsx`                               | `canSkipVerification` 응답 처리                  |
| `PhoneField.dom.test.tsx`                      | 발송 건너뛰기·정상 발송 테스트 2개 추가          |

`status.ts`는 이미 계정 기준이라 변경하지 않았다.

---

## DB 영향

**스키마 변경도 마이그레이션도 없다.** 판정 코드만 바꿨다.

| 항목                        | 수치 |
| --------------------------- | ---- |
| `PhoneVerification` 전체 행 | 202  |
| 그중 인증 완료 행           | 189  |
| 판정 근거에서 빠지는 행     | 30   |
| 영향받는 사용자             | 20   |
| 여러 클럽에서 인증한 사용자 | 1    |
| 계정 인증 사용자            | 158  |

**행은 하나도 지우지 않았다.** 30개 행이 "인증 면제권" 역할만 잃는다.

영향받는 20명은 계정 인증 번호와 다른 옛 번호로 신청할 때 이제 문자를 받아 재인증한다.
**기존에는 문자 없이 통과했고, 그게 이번 버그다.**

계정 인증을 잃는 사용자는 없다. 클럽별 기록만 있고 계정 기록이 없는 사용자는 0명으로
확인했다.

---

## 검증

테스트를 먼저 써서 버그를 재현한 뒤 고쳤다. 수정 전 3개가 실패하는 것을 확인했다.

| 항목           | 결과                    |
| -------------- | ----------------------- |
| 관련 테스트    | 18 passed (신규 11개)   |
| 전체 스위트    | 38개 중 37개 통과       |
| `tsc --noEmit` | 변경분 에러 0 (34 → 25) |
| prettier       | 통과                    |

### 기존에 깨져 있던 것

`sms-notification.test.ts` 6건은 **이 작업 이전부터 실패한다.** `HEAD`의 파일과 바이트
단위로 동일함을 확인했다.

원인은 이 테스트가 `PrismaClient` 생성자를 목으로 바꾸는데, 구현은 `@/lib/prisma`
싱글톤을 임포트하므로 목이 적용되지 않는 것이다. 싱글톤 리팩터링 이후 방치된 테스트다.
이번 변경과 무관해 손대지 않았다.

`tsc` 잔여 에러는 SVG·PNG 모듈 선언 누락과 위 테스트 파일의 목 타입 문제로, 모두
기존 것이다.

---

## 범위에서 제외한 것

**인증 유효기간 기능은 만들지 않았다.** 조사 결과 "만료된 인증"은 현재 존재하지 않는다.

| 대상           | 만료 개념   | 구현 상태             |
| -------------- | ----------- | --------------------- |
| 인증번호 6자리 | 3분         | 동작함 (`verifyCode`) |
| 인증 완료 상태 | 없음        | 영구 유효             |
| 만료 행 정리   | 함수만 존재 | 호출하는 곳이 없음    |

`expiresAt`은 **문자로 받은 코드의 입력 제한시간**이지 인증 자체의 유효기간이 아니다.
인증에 성공하면 그 뒤로 아무도 이 값을 보지 않는다.

주기적 재인증을 요구하지 않기로 했다. 번호는 한 번 본인 것이면 계속 본인 것이고,
동호회 게스트 신청에 재인증을 걸면 이탈만 늘어난다. 번호가 바뀌면 어차피 새 번호라
재인증이 필요하고, 그건 이미 `PhoneField`가 처리한다.

**`cleanupExpiredVerifications`는 정리하지 않았다.** 호출하는 곳이 없는 죽은 코드인데,
이름이 "만료 인증 정리"라 인증 만료 기능이 있는 것처럼 읽힌다. 지우거나 미인증 행만
지우도록 고쳐야 하지만 이번 범위가 아니다.

**`verifyCode`가 `User.phoneNumber`를 덮어쓰는 동작은 남겼다.** 계정 단위 정책에서는
의도된 동작이다. 다만 `clubId`를 인자로 받아 놓고 쓰지 않는 점은 혼란을 준다.

---

## 별건: Prisma 버전 불일치

조사 중 `prisma generate`를 실행했더니 `package.json`의 `@prisma/client`가 `^6.2.1`에서
`^7.10.0`으로 바뀌고 v7이 설치돼 런타임이 깨졌다. 되돌려 양쪽 모두 6.10.1로 맞췄다.

원인은 캐럿 범위가 메이저 버전을 넘길 수 있다는 점이다. CLI는 `prisma: ^6.2.1`로
묶여 있어 둘이 갈라진다. `npm install` 시점에 따라 언제든 재발할 수 있으니 버전 고정이
필요하다. 이번 작업 범위가 아니라 손대지 않았다.

---

## 체크리스트

- [ ] 클럽 1에서 계정 인증 번호와 다른 번호를 넣으면 문자가 오는지 확인
- [ ] 계정 인증 번호를 넣으면 인증 버튼 없이 완료로 표시되는지 확인
- [ ] 하이픈 없이 저장된 계정(9건)이 재인증을 요구받지 않는지 확인
- [ ] 클럽을 옮겨 인증한 뒤 이전 클럽에서 신청해도 정상 동작하는지 확인
- [ ] 재발송 버튼(`forceNewVerification`)이 여전히 문자를 보내는지 확인
- [ ] `cleanupExpiredVerifications` 정리 여부 결정
- [ ] Prisma 버전 고정 여부 결정
