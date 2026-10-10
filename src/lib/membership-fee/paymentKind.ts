import type { NonFeeKind, PaymentRecordKind } from '@prisma/client';

/** 거래 분류의 화면 이름. API가 남기는 기록과 화면이 같은 이름을 쓴다 */
export const PAYMENT_KIND_LABEL: Record<PaymentRecordKind, string> = {
  FEE: '회비',
  JOINING_FEE: '가입비',
  EVENT: '행사',
  OTHER: '기타',
  INTEREST: '이자',
};

/** 한 입금에서 떼어 낸, 회비가 아닌 금액의 성격 */
export const NON_FEE_KIND_LABEL: Record<NonFeeKind, string> = {
  JOINING_FEE: '가입비',
  EVENT: '행사',
  OTHER: '기타',
  OVERPAY: '초과 입금',
};

/** 사람이 분류를 바꿨을 때 남기는 근거. 이전 분류와 그 근거를 함께 적는다 */
export function manualKindReason(previous: {
  kind: PaymentRecordKind;
  kindReason: string | null;
}): string {
  return `직접 변경 (이전: ${PAYMENT_KIND_LABEL[previous.kind]} — ${previous.kindReason ?? '근거 없음'})`;
}

export const NOT_FEE_MESSAGE =
  '회비가 아닌 입금입니다. 분류를 회비로 바꿔주세요';

const CHECK_MEMBER = '회원을 확인해주세요';

/** 자동 매칭이 불확실할 때의 검토 사유. 사람이 회원을 확인하면 사라진다 */
export const UNCERTAIN_MATCH_REASON = `이름이 비슷한 회원으로 자동 매칭됨 — ${CHECK_MEMBER}`;

/** 똑같이 맞는 회원이 여럿이라 그중 한 명에 붙였을 때의 검토 사유 */
export const homonymReason = (count: number) =>
  `같은 이름의 회원이 ${count}명 있습니다 — ${CHECK_MEMBER}`;

/**
 * 저장해 둔 검토 표시의 사유. 표시가 없으면 null.
 * 사유를 따로 적지 않은 표시는 이름이 비슷한 회원으로 붙인 자동 매칭이다.
 */
export function storedReviewReason(record: {
  needsReview: boolean;
  reviewReason?: string | null;
}): string | null {
  if (!record.needsReview) return null;
  return record.reviewReason ?? UNCERTAIN_MATCH_REASON;
}

/** 검토 사유 가운데 "이 회원이 맞는지"를 묻는 것이 있는지 */
export const asksMemberCheck = (reasons: string[]) =>
  reasons.some((reason) => reason.endsWith(CHECK_MEMBER));

/**
 * 일괄 확정으로 바로 확정할 수 있는 건인지.
 * 매칭된 회비이고 검토할 것이 없어야 한다. `needsReview`는 조회 응답의 값(다시 계산한 것)이어야 한다.
 */
export function isBulkConfirmable(record: {
  status: string;
  kind: string;
  needsReview: boolean;
  matchedMemberId?: number | null;
  matchedMembers?: { clubMemberId: number }[];
}): boolean {
  return (
    record.status === 'MATCHED' &&
    record.kind === 'FEE' &&
    !record.needsReview &&
    (record.matchedMemberId != null || (record.matchedMembers?.length ?? 0) > 0)
  );
}
