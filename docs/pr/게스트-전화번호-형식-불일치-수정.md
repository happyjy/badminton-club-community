# 게스트 전화번호 형식 불일치 수정

## 배경 (Why)

게스트 신청 상세 페이지에서 전화번호가 서로 다른 형식으로 저장되어 있는 것이 확인됨.

| 구분   | 값                  |
| ------ | ------------------- |
| 정상   | `010-2743-9047`     |
| 비정상 | `01079366342`       |
| 비정상 | `010-71347219-7219` |

게스트 신청 경로에는 **전화번호 정규화·검증이 한 군데도 없었다.** 3칸 분리 입력이 만든
문자열이 그대로 DB까지 저장됐다. `src/utils/phoneNumber.ts`에 포맷터·검증기가 있지만
**토너먼트 기능만 사용하고 게스트 기능은 전혀 사용하지 않는 상태**였다.

### 원인 1. 인증 단계의 무포맷 입력 → `01079366342`

`PhoneVerificationStep`은 3칸 입력이 아니라 **단일 자유 입력 필드**였다.

```ts
const handlePhoneNumberChange = (e) => {
  setPhoneNumber(e.target.value); // 하이픈 삽입 없음, 정규화 없음
};
```

placeholder만 `010-1234-5678`이고 사용자가 하이픈 없이 입력하면 그대로 저장된다.
서버의 `validatePhoneNumber`는 **하이픈을 제거한 뒤** 검사하므로(`sms-verification.ts:16`)
`01079366342`를 **통과시킨다.** 검증기가 하이픈 유무에 관대해 형식 불일치를 잡지 못했다.

이 값이 `User.phoneNumber`에 저장되고, 게스트 신청 API는
`user.phoneNumber !== phoneNumber` 정확 문자열 일치로 게이트를 걸기 때문에
**비정상 형식이 그대로 `GuestPost`까지 전파**됐다.

### 원인 2. 편집 모달의 증폭 루프 → `010-71347219-7219`

`useClubJoinForm`의 `useState` 초기화가 저장값을 `split('-')`으로 3칸에 나눠 담았다.

```ts
const parts = initialValues.phoneNumber.split('-');
return { first: parts[0], second: parts[1], third: parts[2] }; // 길이 검증 없음
```

`onChangePhoneNumber`에는 `if (value.length > maxLength) return;` 가드가 있지만
**초기화 경로는 이 가드를 거치지 않는다.**

```
'01079366342'.split('-')  →  { first: '01079366342', second: '', third: '' }
   여기서 third 칸만 입력  →  '01079366342--6342'
```

한 번 깨지면 되돌릴 수 없다. 상세 페이지가 저장값을 편집 모달에 다시 넣고,
`split('-')`이 `second: '71347219'`(8자리)를 state에 그대로 실은 뒤,
사용자가 **아무 칸이나** 건드리면 그 8자리가 그대로 다시 합쳐진다.

```
'010-71347219-7219'.split('-')  →  second: '71347219'
   first 칸만 다시 건드려도      →  '010-71347219-7219'  (그대로 재저장)
```

### 원인 3. 서버 검증 부재

`guests/apply.ts`, `users/me.ts`, `users/me/phone.ts` — **세 write 경로 모두 전화번호
검증 호출이 없었다.** `GuestPost.phoneNumber`도 제약 없는 `String`이다.

`validatePhoneNumber`는 인증 send/verify 경로에만 있고, 하이픈을 제거하고 검사하므로
**형식 일관성은 애초에 검사 대상이 아니었다.** `normalizePhoneNumber`는 SMS 발송
직전에만 사용되어 저장값에 영향을 주지 않았다.

### 대조군: 토너먼트는 왜 멀쩡한가

`tournament.schema.ts`는 `.refine(isValidPhoneNumber).transform(formatPhoneNumber)`로
**검증 후 정규화**하고, 입력 컴포넌트도 `toPhoneDigits`/`formatPhoneNumber` 쌍으로
표시-저장을 분리한다. 게스트 기능만 이 유틸이 만들어지기 전 코드로 남아 있었다.

---

## 작업 내용 (What)

### 1. 자리 수 기준 분할·결합 유틸 추가 (`src/utils/phoneNumber.ts`)

하이픈 위치가 아니라 **자리 수**를 기준으로 나눈다. 하이픈이 빠졌거나 이미 손상된 값이
들어와도 각 칸의 최대 길이를 넘지 않아 증폭 루프가 생기지 않는다.

- `splitPhoneParts` — 저장 문자열 → 3칸 상태 (각 칸 최대 길이 보장)
- `joinPhoneParts` — 3칸 상태 → 저장 문자열 (빈 칸은 하이픈을 남기지 않음)
- `clampPhonePart` — 붙여넣기로 넘친 입력을 통째로 버리지 않고 잘라서 수용
- `toDisplayPhoneNumber` — 표시용 보정 + 손상 여부 판정

### 2. 편집 모달 재초기화 수정

- `useClubJoinForm`: `split('-')` → `splitPhoneParts`
- `profile/index.tsx`: 동일한 `split('-')` 파싱을 같은 방식으로 수정
- `JoinModal.getFullPhoneNumber`: 직접 문자열 결합 → `joinPhoneParts`

### 3. 인증 단계 입력 정규화

- `PhoneVerificationStep`: 입력 시 `formatPhoneNumber` 적용해 하이픈 자동 삽입
- 인증번호 발송 전 `getPhoneNumberError`로 형식 검증 (기존에는 빈 값만 확인)

### 4. 서버 검증·정규화 추가

| API                 | 조치                                                           |
| ------------------- | -------------------------------------------------------------- |
| `guests/apply.ts`   | `isValidPhoneNumber` 검증 + `formatPhoneNumber` 정규화 후 저장 |
| `users/me.ts`       | 동일 (번호가 넘어온 경우에만 검증)                             |
| `users/me/phone.ts` | 정규화 후 저장. 변경 여부도 정규화한 값끼리 비교               |

`guests/apply.ts`의 인증 대조는 양쪽을 정규화해 비교하도록 바꿨다.
문자열을 그대로 비교하면 같은 번호인데도 형식이 달라 반려되기 때문이다.

### 5. 기존 데이터 표시 보정 (`PhoneNumberText`)

이미 저장된 값은 **표시할 때** 보정한다. 단, 숫자가 11자리를 넘는 값은 **잘라내지 않는다.**

`010-71347219-7219`은 숫자만 **15자리**다. `toPhoneDigits`가 11자리에서 자르므로
그대로 포맷하면 `010-7134-7219`가 되는데, 이는 **근거 없는 추측이 정상 번호처럼 보이는**
결과다. 실제 번호는 `010-7134-7219`일 수도 `010-7219-7219`일 수도 있어 복원이 불가능하다.
임원진이 이 번호로 연락하면 엉뚱한 사람에게 갈 수 있다.

따라서 이런 값은 **원본을 보존하고 `확인 필요` 배지를 붙여** 사람이 판단하게 했다.

| 저장값              | 화면 표시                         |
| ------------------- | --------------------------------- |
| `010-2743-9047`     | `010-2743-9047`                   |
| `01079366342`       | `010-7936-6342`                   |
| `010-71347219-7219` | `010-71347219-7219` + `확인 필요` |

### 6. 부수 수정: stale closure

`onChangePhoneNumber`가 `phoneNumbers`를 클로저에서 읽어 `formData.phoneNumber`가
**한 박자 밀리던** 문제를 함께 수정했다 (게스트 폼·프로필 양쪽).

---

## 변경 파일 요약

| 구분     | 파일                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 유틸     | `src/utils/phoneNumber.ts`                                                                                                                                        |
| 컴포넌트 | `src/components/molecules/form/PhoneNumberText.tsx` (신규)                                                                                                        |
| 폼       | `src/hooks/useClubJoinForm.ts`, `src/components/organisms/modal/join/JoinModal.tsx`                                                                               |
| 인증     | `src/components/organisms/forms/PhoneVerificationStep.tsx`                                                                                                        |
| API      | `src/pages/api/clubs/[id]/guests/apply.ts`, `src/pages/api/users/me.ts`, `src/pages/api/users/me/phone.ts`                                                        |
| 페이지   | `src/pages/clubs/[id]/guest/[guestId]/index.tsx`, `src/pages/profile/index.tsx`                                                                                   |
| 테스트   | `src/utils/__tests__/phoneNumber.test.ts`, `src/utils/__tests__/phoneNumberParts.test.ts`, `src/components/molecules/form/__tests__/PhoneNumberText.dom.test.tsx` |

---

## 검증

| 항목           | 결과                   |
| -------------- | ---------------------- |
| 테스트         | 407 passed (신규 21개) |
| `tsc --noEmit` | 변경분 에러 없음       |
| lint           | 에러 0                 |

전체 실행 시 실패하는 16개(`GuestPageStrategy`, `sms-notification`)는 **이 작업 이전
main에서도 동일하게 실패**한다. stash로 대조 확인했으며, 이번 변경과 무관해 손대지 않았다.

---

## 범위에서 제외한 것

**기존 데이터 보정(DB 마이그레이션)은 포함하지 않았다.** 운영 DB 작업이라 별도 확인이 필요하다.

현재 상태는 다음과 같다.

- `01079366342` — 화면에서 `010-7936-6342`로 정상 표시되어 실질적으로 해결
- `010-71347219-7219` — `확인 필요` 배지로 식별은 가능하나, **실제 번호는 복원 불가**.
  해당 신청자에게 연락하려면 사람이 직접 확인해야 한다.

---

## 체크리스트

- [ ] 게스트 신청 폼에서 전화번호 입력·자동 포커스 이동이 정상 동작하는지 확인
- [ ] 게스트 신청 수정(편집 모달) 시 전화번호가 3칸에 올바르게 채워지는지 확인
- [ ] 전화번호 인증 화면에서 하이픈이 자동으로 삽입되는지 확인
- [ ] 게스트 상세에서 기존 비정상 번호가 의도대로 표시되는지 확인
- [ ] 프로필 페이지 전화번호 수정이 정상 동작하는지 확인
- [ ] 기존 데이터 보정 진행 여부 결정
