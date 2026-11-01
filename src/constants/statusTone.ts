/**
 * 도메인 상태 → 상태색 톤. 이 대응은 여기서만 정한다.
 * 화면에서 `status === 'APPROVED' ? … : …`로 색을 고르지 않는다.
 *
 * 값의 출처: prisma/schema/enums.prisma, membershipFee.prisma(상태·입금 분류),
 * workout.prisma(참가 status), src/types/enums.ts(회원 Status).
 */
export type Tone = 'positive' | 'warning' | 'negative' | 'neutral';

export type StatusDomain =
  | 'guest'
  | 'member'
  | 'participation'
  | 'entryPayment'
  | 'entryEvent'
  | 'tournament'
  | 'feeRecord'
  | 'paymentKind';

const TONES: Record<StatusDomain, Record<string, Tone>> = {
  guest: {
    PENDING: 'warning',
    APPROVED: 'positive',
    REJECTED: 'negative',
  },
  // 활동 중(APPROVED)을 초록으로 하면 회원 445명 목록이 온통 초록이 된다.
  member: {
    PENDING: 'warning',
    APPROVED: 'neutral',
    ON_LEAVE: 'neutral',
    REJECTED: 'negative',
    LEFT: 'neutral',
  },
  participation: {
    CONFIRMED: 'positive',
    WAITLIST: 'warning',
  },
  entryPayment: {
    PENDING: 'warning',
    CONFIRMED: 'positive',
    CANCELED: 'negative',
  },
  entryEvent: {
    ACTIVE: 'positive',
    CANCELED: 'negative',
  },
  tournament: {
    DRAFT: 'neutral',
    OPEN: 'positive',
    CLOSED: 'neutral',
  },
  feeRecord: {
    PENDING: 'warning',
    MATCHED: 'positive',
    CONFIRMED: 'positive',
    ERROR: 'negative',
    SKIPPED: 'neutral',
  },
  // 입금 분류. 회비가 아닌 건은 눈에 띄지 않게 두고, 금액이 큰 가입비만 구분되게 한다.
  paymentKind: {
    FEE: 'positive',
    JOINING_FEE: 'warning',
    EVENT: 'neutral',
    OTHER: 'neutral',
    INTEREST: 'neutral',
  },
};

export function statusTone(
  domain: StatusDomain,
  status: string | null | undefined
): Tone {
  if (!status) return 'neutral';

  const tones = TONES[domain];
  // 'constructor' 같은 상속 속성이 걸리지 않게 자기 속성만 본다.
  return Object.prototype.hasOwnProperty.call(tones, status)
    ? tones[status]
    : 'neutral';
}
