import type {
  MatchResult,
  MonthHints,
  ParsedPaymentRow,
} from '@/types/membership-fee.types';

import {
  isLowConfidenceMatch,
  planRecord,
  type PlannerContext,
  ratesForYear,
  type RecordPlan,
} from './confirmPlanner';
import { kstMonthIndex, kstYearMonth } from './kst';
import { isMatchableAt } from './matchableMembers';
import { matchDepositor, resolveMatchedMemberIds } from './memberMatcher';
import { pickMonthHints } from './monthHintParser';
import { homonymReason } from './paymentKind';
import {
  type Classification,
  classifyTransaction,
  type FeeRateSettings,
  findEventClusters,
  refineForEstablishedMember,
} from './transactionClassifier';

import type { NonFeeKind, PaymentRecordKind } from '@prisma/client';

/**
 * 통장에서 읽은 입금 행을 저장할 모양으로 판정한다:
 * 분류 → 거래일 시점의 회원 매칭 → 단가·개월 수·납부월 계획.
 *
 * DB를 읽거나 쓰지 않는다. 필요한 맥락은 호출자가 한 번 읽어 넘긴다.
 */

type MatcherCoupleGroups = NonNullable<Parameters<typeof matchDepositor>[2]>;

export interface UploadMember {
  id: number;
  name: string | null;
  status: string;
  leftAt: Date | null;
  feeObligationStartAt: Date | null;
}

/** 입금자명으로 회원을 찾는 데 필요한 것 */
export interface MatchInputs {
  /** 클럽의 전체 회원. 거래일마다 후보를 걸러 쓴다 */
  members: UploadMember[];
  coupleGroups: MatcherCoupleGroups;
}

export interface UploadDeps extends MatchInputs {
  ctx: PlannerContext;
}

/** 입금 한 건을 어떻게 저장할지 */
export interface RecordDraft {
  row: ParsedPaymentRow;
  kind: PaymentRecordKind;
  kindReason: string;
  nonFeeAmount: number;
  nonFeeKind: NonFeeKind | null;
  monthHints: MonthHints | null;
  status: 'SKIPPED' | 'PENDING' | 'MATCHED' | 'ERROR';
  /** 처리할 수 없는 사유. 금액·월의 검토 사유는 저장하지 않는다 (조회할 때 계산) */
  errorReason: string | null;
  /** 사람이 확인해야 풀리는 검토 표시 (불확실한 자동 매칭, 행사비일 수 있는 금액) */
  needsReview: boolean;
  /** 그 사유. 이름이 비슷한 회원으로 붙인 경우는 따로 적지 않는다 (null) */
  reviewReason: string | null;
  memberIds: number[];
  /** 업로드 시점의 계획. 매칭된 회비 건에만 있다 */
  plan: RecordPlan | null;
}

/**
 * 신규 회원으로 볼 기간: 의무 시작월의 앞뒤 한 달.
 * 이때 낸 가입비 금액은 가입비로, 그 밖의 회원이 낸 같은 금액은 회비로 본다.
 */
const NEW_MEMBER_MONTHS = 1;

function isNewMemberAt(member: UploadMember | undefined, at: Date): boolean {
  if (!member?.feeObligationStartAt) return false;
  return (
    Math.abs(kstMonthIndex(member.feeObligationStartAt) - kstMonthIndex(at)) <=
    NEW_MEMBER_MONTHS
  );
}

/** 거래일에 활동 중이던 회원 가운데서 입금자명에 맞는 회원을 찾는다 */
function matchAt(
  depositorName: string,
  transactionDate: Date,
  { members, coupleGroups }: MatchInputs
): MatchResult {
  const candidates = members
    .filter((member) => isMatchableAt(member, transactionDate))
    .map((member) => ({ id: member.id, name: member.name }));
  return matchDepositor(
    depositorName,
    candidates,
    coupleGroups,
    transactionDate
  );
}

/** 자동 매칭을 사람이 확인해야 하는지와 그 사유 */
function reviewOfMatch(match: MatchResult): {
  needsReview: boolean;
  reviewReason: string | null;
} {
  if (match.ambiguousCount) {
    return {
      needsReview: true,
      reviewReason: homonymReason(match.ambiguousCount),
    };
  }
  return {
    needsReview: isLowConfidenceMatch(match.confidence),
    reviewReason: null,
  };
}

/**
 * 저장된 입금 내역의 회원을 입금자명으로 다시 찾는다.
 * 행사·기타로 분류돼 매칭하지 않았던 건을 회비로 되돌릴 때 쓴다.
 */
export function rematchMembers(
  record: {
    depositorName: string;
    transactionDate: Date;
    amount: number;
    nonFeeAmount: number;
  },
  inputs: MatchInputs,
  rates: FeeRateSettings | null
): { memberIds: number[]; needsReview: boolean; reviewReason: string | null } {
  const match = matchAt(record.depositorName, record.transactionDate, inputs);
  const memberIds = rates
    ? resolveMatchedMemberIds(match, record.amount - record.nonFeeAmount, rates)
    : match.memberId != null
      ? [match.memberId]
      : [];
  if (memberIds.length === 0) {
    return { memberIds, needsReview: false, reviewReason: null };
  }
  return { memberIds, ...reviewOfMatch(match) };
}

export function judgeUploadRows(
  rows: ParsedPaymentRow[],
  deps: UploadDeps
): RecordDraft[] {
  const { ctx, members } = deps;
  const memberById = new Map(members.map((member) => [member.id, member]));
  const ratesOf = (date: Date) =>
    ratesForYear(ctx, kstYearMonth(date).year)?.rates ?? null;

  // 표시 없이 몰려 들어온 행사 입금 (단가 설정이 있는 해의 행만 본다)
  const clusters = findEventClusters(
    rows.filter((row) => ratesOf(row.transactionDate) != null),
    (year) => ratesForYear(ctx, year)!.rates
  );

  return rows.map((row): RecordDraft => {
    const monthHints = pickMonthHints(
      row.depositorName,
      row.memo,
      row.transactionDate
    );
    const rates = ratesOf(row.transactionDate);
    if (!rates) {
      return {
        row,
        kind: 'FEE',
        kindReason: '회비 설정 없음',
        nonFeeAmount: 0,
        nonFeeKind: null,
        monthHints,
        status: 'ERROR',
        errorReason: `${kstYearMonth(row.transactionDate).year}년 회비 설정이 없습니다`,
        needsReview: false,
        reviewReason: null,
        memberIds: [],
        plan: null,
      };
    }

    let classification: Classification = classifyTransaction(row, rates);
    const clusterReason = clusters.events.get(row);
    if (classification.kind === 'FEE' && clusterReason) {
      classification = {
        kind: 'EVENT',
        kindReason: clusterReason,
        nonFeeAmount: 0,
        nonFeeKind: null,
        needsReview: false,
        joiningGuessed: false,
      };
    }

    const draft = (
      over: Pick<RecordDraft, 'status' | 'memberIds'> &
        Partial<
          Pick<
            RecordDraft,
            'errorReason' | 'needsReview' | 'reviewReason' | 'plan'
          >
        >
    ): RecordDraft => ({
      row,
      kind: classification.kind,
      kindReason: classification.kindReason,
      nonFeeAmount: classification.nonFeeAmount,
      nonFeeKind: classification.nonFeeKind,
      monthHints,
      errorReason: null,
      needsReview: false,
      reviewReason: null,
      plan: null,
      ...over,
    });

    // 회비가 아니라고 분명한 건은 매칭하지 않는다.
    // 금액만으로 추정한 가입비는 누가 냈는지 봐야 하므로 매칭까지 간다.
    const needsMatching =
      classification.kind === 'FEE' || classification.joiningGuessed;
    if (!needsMatching) return draft({ status: 'SKIPPED', memberIds: [] });

    const match = matchAt(row.depositorName, row.transactionDate, deps);

    if (
      classification.joiningGuessed &&
      match.memberId != null &&
      !isNewMemberAt(memberById.get(match.memberId), row.transactionDate)
    ) {
      classification = refineForEstablishedMember(
        classification,
        row.amount,
        rates
      );
    }

    const memberIds = resolveMatchedMemberIds(
      match,
      row.amount - classification.nonFeeAmount,
      rates
    );

    if (classification.kind !== 'FEE') {
      // 가입비로 남은 건. 누구의 가입비인지 알 수 있게 매칭 회원은 남긴다.
      return draft({
        status: 'SKIPPED',
        memberIds: match.memberId != null ? [match.memberId] : [],
      });
    }
    if (memberIds.length === 0) {
      return draft({
        status: 'PENDING',
        memberIds: [],
        errorReason: '회원 매칭 실패',
      });
    }

    const plan = planRecord(ctx, {
      memberIds,
      transactionDate: row.transactionDate,
      amount: row.amount,
      nonFeeAmount: classification.nonFeeAmount,
      monthHints,
      matchConfidence: match.confidence,
    });
    // 행사가 몰린 기간에 들어온, 행사 몇 명 몫이면서 회비 단가의 배수이기도 한 금액.
    // 행사로 건너뛰지도 회비로 확정하지도 않고 사람이 보게 한다.
    const eventDoubt = clusters.suspects.get(row) ?? null;
    const memberReview = reviewOfMatch(match);
    return draft({
      status: plan.error ? 'ERROR' : 'MATCHED',
      memberIds,
      errorReason: plan.error,
      needsReview: memberReview.needsReview || eventDoubt != null,
      reviewReason:
        [eventDoubt, memberReview.reviewReason]
          .filter((reason) => reason != null)
          .join(' · ') || null,
      plan,
    });
  });
}

export interface DraftSummary {
  total: number;
  fee: number;
  joiningFee: number;
  event: number;
  other: number;
  interest: number;
  matched: number;
  pending: number;
  error: number;
}

export function summarizeDrafts(drafts: RecordDraft[]): DraftSummary {
  const count = (predicate: (draft: RecordDraft) => boolean) =>
    drafts.filter(predicate).length;
  return {
    total: drafts.length,
    fee: count((d) => d.kind === 'FEE'),
    joiningFee: count((d) => d.kind === 'JOINING_FEE'),
    event: count((d) => d.kind === 'EVENT'),
    other: count((d) => d.kind === 'OTHER'),
    interest: count((d) => d.kind === 'INTEREST'),
    matched: count((d) => d.status === 'MATCHED'),
    pending: count((d) => d.status === 'PENDING'),
    error: count((d) => d.status === 'ERROR'),
  };
}
