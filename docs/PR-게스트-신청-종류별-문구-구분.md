# 게스트 신청 / 클럽 가입신청 문구 구분

> 관련 PR: [#73](https://github.com/happyjy/badminton-club-community/pull/73), [#74](https://github.com/happyjy/badminton-club-community/pull/74)
> 머지 커밋: `d22cf7c`, `3137449`

## 배경 (Why)

### 두 신청은 같은 테이블을 쓴다

**게스트 신청**과 **클럽 가입신청**은 별개 기능처럼 보이지만, 실제로는 같은 `GuestPost` 테이블에 저장된다.
연락처도 `phoneNumber` **한 컬럼**을 공유하고, 구분은 `postType` enum 하나뿐이다.

어느 쪽이 될지는 URL이 아니라 **신청 시점에 그 클럽의 멤버인지**로 갈린다.

```ts
// src/hooks/useClubJoinForm.ts:22
const postType = clubMember ? 'GUEST_REQUEST' : 'JOIN_INQUIRY_REQUEST';
```

| | 클럽 가입신청 | 게스트 신청 |
|---|---|---|
| 모달 | `GuestInquiryModal` | `GuestApplicationModal` |
| `postType` | `JOIN_INQUIRY_REQUEST` | `GUEST_REQUEST` |
| 신청자 | 비회원 (본인이 직접) | 회원 (남의 방문을 대신) |
| 번호 주인 | 방문자 본인 | **신청한 회원** (방문자 아님) |

번호 주인이 다르다는 점이 핵심이다. 게스트 신청은 회원이 지인의 방문을 대신 신청하므로,
저장된 번호는 게스트가 아니라 **신청한 회원**의 것이다.

### 문제 1 — 상세 화면이 보는 사람에 따라 달라졌다 (#73)

상세 페이지가 `postType`을 **아예 읽지 않고**, 전략을 "지금 보는 사람"으로 고르고 있었다.

```ts
// 글쓴이가 아니라 현재 접속자 기준이었다
const strategy = getGuestPageStrategy(!!clubMember);
```

`getServerSideProps`의 `select`에 `postType`이 빠져 있어 애초에 알 수가 없었다.
그 결과 **관리자(회원)가 열면 가입신청 글까지 "게스트 신청 상세"로** 보이고,
비회원이 열면 반대로 보였다. 제목과 메시지 섹션 라벨이 모두 영향을 받았다.

### 문제 2 — 의미가 다른 연락처를 같게 보여줬다 (#73)

신청 폼은 이미 이 차이를 반영해 게스트 신청 쪽을 "신청자 연락처" 섹션으로 감싸고 있었다
(`GuestApplicationModal.tsx`). 그런데 상세 화면은 두 신청 모두 `전화번호`로 똑같이 찍었다.

### 문제 3 — 관리자 알림 메일도 마찬가지였다 (#74)

가입신청도 `sendGuestApplicationEmail` 같은 함수를 쓰는데, 신청 종류를 전혀 반영하지 않았다.
관리자는 보통 **이 메일만 보고 연락**하므로 화면보다 오히려 영향이 크다.

가입신청인데 제목이 "OO님을 **게스트로 초대**합니다"로 나가 오해를 부를 수 있었다.

## 작업 내용 (What)

### 1. 판단 기준을 `postType`으로 통일 (#73)

`GuestPageStrategy`에 글 종류 기반 팩토리를 추가했다.
글의 `postType`은 신청 시점에 고정된 값이라 보는 사람에 따라 흔들리지 않는다.

```ts
export const getGuestPageStrategyByPostType = (
  postType: GuestPostType | undefined,
  customDescription?: string
): GuestPageStrategy =>
  getGuestPageStrategy(postType !== 'JOIN_INQUIRY_REQUEST', customDescription);
```

- `postType`이 없는 예전 글은 게스트 신청으로 본다 (스키마 기본값과 동일)
- 미사용 상태인 `INQUIRY_REQUEST`도 같은 이유로 게스트 신청으로 본다
- `getServerSideProps`의 `select`에 `postType: true` 추가
- **수정 모달 분기도 `postType` 기준으로 교체** — 비회원으로 가입신청한 뒤 회원이 되면
  가입신청 글에 게스트 신청 폼이 뜨던 문제도 함께 해소

### 2. 연락처 라벨 분기 (#73, #74)

`GuestPageStrategy`에 `getPhoneLabel()`을 추가하고, 상세 화면과 알림 메일이 **같은 전략을 재사용**하도록 했다.
두 경로의 문구가 앞으로 어긋날 여지를 없애기 위함이다.

| 신청 종류 | 연락처 라벨 |
|---|---|
| 게스트 신청 | **신청자 연락처** |
| 클럽 가입신청 | 전화번호 |

### 3. 알림 메일 제목 분기 (#74)

| | 이전 (두 신청 공통) | 이후 |
|---|---|---|
| 게스트 신청 | `배드민턴 클럽 게스트 신청: OO님을 게스트로 초대합니다.` | 동일 |
| 클럽 가입신청 | 위와 같음 (오해 소지) | `배드민턴 클럽 클럽 가입신청: OO님이 가입을 문의했습니다.` |

### 4. 함께 정리한 것

- **낡은 테스트 10개 수정 (#73):** `GuestPageStrategy.test.ts`의 `NonMemberStrategy` 기대값이
  이전부터 깨져 있었다. 문구가 "문의하기" → "가입신청"으로 바뀔 때 테스트가 따라가지 못한 것으로,
  코드가 맞고 테스트가 낡은 상태였다. 같은 파일을 건드리는 김에 현재 문구에 맞춰 고쳤다.
- **타입 확장 (#74):** `getGuestPageStrategyByPostType`의 인자를 손으로 쓴 문자열 유니온에서
  Prisma `GuestPostType`으로 넓혔다. enum에 미사용 값 `INQUIRY_REQUEST`가 있어
  좁은 유니온으로는 실제 `GuestPost.postType`을 받을 수 없었다 (타입 에러로 발견).
- **메일 템플릿 테스트 신설 (#74):** 기존에 테스트가 없던 영역이다.

## 검토했지만 바꾸지 않은 것

신청 폼의 `PhoneField` 라벨이 "전화번호"인 점을 함께 봤으나 **그대로 두는 것이 맞다고 판단했다.**

게스트 신청 폼은 이미 "신청자 연락처" 섹션 제목과 "게스트 관련 연락을 받을 번호입니다" 설명으로
그 필드를 감싸고 있다. 필드 라벨까지 바꾸면 같은 문구가 위아래로 두 번 나온다.
가입신청 폼의 "전화번호"는 본인 번호가 맞으므로 문제가 없다.

즉 **폼은 이미 올바른 상태였고, 잘못된 것은 상세 화면과 알림 메일뿐이었다.**

---

## 변경 파일 요약

| 구분 | 파일 | PR |
|------|------|-----|
| 전략 | `src/strategies/GuestPageStrategy.ts` | #73, #74 |
| 전략 테스트 | `src/strategies/GuestPageStrategy.test.ts` | #73 |
| 상세 페이지 | `src/pages/clubs/[id]/guest/[guestId]/index.tsx` | #73 |
| 메일 | `src/lib/email.ts`, `src/lib/email/templates/guestApplication.ts` | #74 |
| 메일 테스트 | `src/lib/email/templates/guestApplication.test.ts` (신규) | #74 |

DB 스키마 변경은 없다. 표시 문구와 판단 기준만 바뀐다.

## 테스트

```bash
npx jest src/strategies/ src/lib/email/
# 38개 통과 (#73 이전: 10 실패 / 20 통과)
```

추가한 케이스:

- `getPhoneLabel`이 전략별로 다른 라벨을 준다
- `postType`으로 전략을 고른다 (`GUEST_REQUEST` / `JOIN_INQUIRY_REQUEST`)
- `postType`이 없으면 게스트 신청으로 폴백한다
- 메일 본문이 신청 종류에 따라 연락처 라벨을 다르게 적는다
- 라벨이 바뀌어도 번호 자체는 그대로 담는다

전체 스위트의 `sms-notification.test.ts` 6개 실패와 `tsc --noEmit` 에러 25개는
**두 PR 이전부터 동일하게 존재**하던 것으로 이번 변경과 무관함을 확인했다.

## 체크리스트

- [ ] 관리자 계정으로 **가입신청** 글을 열어 제목이 "클럽 가입신청 상세"로 나오는지 확인
- [ ] 게스트 신청 상세의 연락처 라벨이 "신청자 연락처"로 나오는지 확인
- [ ] 가입신청 알림 메일 제목이 "가입을 문의했습니다"로 나가는지 확인
- [ ] 운영상 게스트 신청 상세를 보고 **게스트 본인에게** 연락하던 흐름이 있었다면 함께 점검
