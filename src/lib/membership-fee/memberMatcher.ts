import { MatchResult } from '@/types/membership-fee.types';

import { isMonthObligated, type LeavePeriod } from './feeObligation';
import { kstYearMonth } from './kst';
import { extractNameToken, isNameLikeToken } from './nameNormalizer';

interface Member {
  id: number;
  name: string | null;
}

interface CoupleGroupMember {
  clubMemberId: number;
  clubMember: {
    id: number;
    name: string | null;
    /** 회비 의무 시작일. 없으면 당해 연도 1월부터 의무로 간주 */
    feeObligationStartAt?: Date | null;
    /** 탈퇴일. 있으면 그 월 이후 의무 없음 */
    leftAt?: Date | null;
    /** 휴회/병가 기간 목록 */
    leavePeriods?: LeavePeriod[];
  };
}

interface CoupleGroup {
  id: number;
  members: CoupleGroupMember[];
}

/**
 * 입금일이 속한 연·월 기준으로 회원이 회비 의무 상태인지 판정.
 * 매칭 단계에서 배우자 자동 추가 가능 여부 판정에 사용한다.
 * 의무 정보가 없는 호출(하위 호환)에서는 transactionDate가 없으면 true 처리해 동작 변경 없음.
 */
function isMemberObligatedAt(
  member: CoupleGroupMember['clubMember'],
  transactionDate: Date | null
): boolean {
  if (!transactionDate) return true;
  const { year, month } = kstYearMonth(transactionDate);
  return isMonthObligated(
    year,
    month,
    member.feeObligationStartAt ?? null,
    member.leavePeriods ?? [],
    member.leftAt ?? null
  );
}

/**
 * exact/partial로 단독 매칭된 회원을 받아, 부부 그룹 소속이고
 * 배우자가 입금일 속한 월에 함께 의무인 경우 두 명을 묶어 couple로 격상.
 * 그 외(배우자 탈퇴/휴회/미가입, 부부 그룹 아님 등)에는 원본 결과를 그대로 반환.
 */
function maybeAttachSpouse(
  baseResult: MatchResult,
  coupleGroups: CoupleGroup[],
  transactionDate: Date | null
): MatchResult {
  if (baseResult.memberId == null) return baseResult;
  const couple = coupleGroups.find((g) =>
    g.members.some((m) => m.clubMemberId === baseResult.memberId)
  );
  if (!couple || couple.members.length < 2) return baseResult;

  const self = couple.members.find(
    (m) => m.clubMemberId === baseResult.memberId
  );
  const spouses = couple.members.filter(
    (m) => m.clubMemberId !== baseResult.memberId
  );
  if (!self || spouses.length === 0) return baseResult;

  if (!isMemberObligatedAt(self.clubMember, transactionDate)) {
    return baseResult;
  }
  const eligibleSpouses = spouses.filter((s) =>
    isMemberObligatedAt(s.clubMember, transactionDate)
  );
  if (eligibleSpouses.length === 0) return baseResult;

  const memberIds = [
    baseResult.memberId,
    ...eligibleSpouses.map((s) => s.clubMemberId),
  ];
  return {
    ...baseResult,
    matchType: 'couple',
    memberIds,
    spouseAutoAttached: true,
  };
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/** 회원 이름에서 성(첫 글자) 제외. 2자 이상일 때만 의미 있음 */
function getNameWithoutSurname(fullName: string): string {
  const t = fullName.trim();
  if (t.length < 2) return '';
  return t.slice(1);
}

/** 입금자 명에 문자열이 포함되는지 (공백/숫자 제거 후에도 부분 일치 가능) */
function depositorContains(depositor: string, part: string): boolean {
  if (!part || part.length === 0) return false;
  return depositor.includes(part.trim());
}

const NO_MATCH: MatchResult = {
  memberId: null,
  memberName: null,
  matchType: 'none',
  confidence: 0,
};

/** 유사 매칭을 허용할 이름 토큰의 최대 길이. 더 길면 이름이 아닌 글자가 섞였을 가능성이 크다. */
const MAX_SIMILAR_TOKEN_LENGTH = 3;

/**
 * 입금자명을 회원에 매칭한다.
 *
 * 입금자명에는 "가나다3월회비"처럼 월·회비가 붙는 일이 많아, 원문과 이름 토큰
 * (`extractNameToken`) 두 가지로 매칭해 신뢰도가 높은 쪽을 쓴다.
 * 유사 매칭(한 글자 차이)은 짧은 이름 토큰에만 허용한다.
 *
 * `members`는 호출자가 거래일 시점의 후보로 걸러서 넘긴다 (`isMatchableAt`).
 */
export function matchDepositor(
  depositorName: string,
  members: Member[],
  coupleGroups: CoupleGroup[] = [],
  /**
   * 입금일. 부부 자동 추가 시 의무월 판정에 사용.
   * 미전달이면 의무 검증 없이 부부 그룹 소속만으로 자동 추가 (하위 호환).
   */
  transactionDate: Date | null = null
): MatchResult {
  const raw = depositorName?.trim() ?? '';
  if (raw === '') return NO_MATCH;

  const token = extractNameToken(raw);
  const allowSimilar =
    isNameLikeToken(token) && token.length <= MAX_SIMILAR_TOKEN_LENGTH;

  if (token === raw) {
    return matchOnce(raw, members, coupleGroups, transactionDate, allowSimilar);
  }

  const byRaw = matchOnce(raw, members, coupleGroups, transactionDate, false);
  if (token === '') return byRaw;
  const byToken = matchOnce(
    token,
    members,
    coupleGroups,
    transactionDate,
    allowSimilar
  );
  return byToken.confidence > byRaw.confidence ? byToken : byRaw;
}

/**
 * 자동 매칭 결과에서 실제로 쓸 회원 ID 목록을 정한다.
 *
 * 한 사람 이름만 적힌 입금에 배우자가 자동으로 붙었더라도, 입금액이 부부 단가가 아니라
 * 개인 단가의 배수면 본인 몫만 낸 것으로 보고 배우자를 뗀다.
 * (부부 중 한 명이 25,000원씩 따로 내는 경우가 매달 "부족"으로 잡히지 않게.)
 */
export function resolveMatchedMemberIds(
  match: MatchResult,
  feeAmount: number,
  rates: { regularMonthly: number; coupleMonthly: number }
): number[] {
  const ids =
    match.memberIds && match.memberIds.length > 0
      ? match.memberIds
      : match.memberId != null
        ? [match.memberId]
        : [];
  if (!match.spouseAutoAttached || match.memberId == null) return ids;

  const isCoupleMultiple =
    rates.coupleMonthly > 0 && feeAmount % rates.coupleMonthly === 0;
  const isRegularMultiple =
    rates.regularMonthly > 0 && feeAmount % rates.regularMonthly === 0;
  return !isCoupleMultiple && isRegularMultiple ? [match.memberId] : ids;
}

/**
 * 똑같이 맞는 회원이 여럿이면 그 수를 싣는다 (동명이인).
 * 누구의 돈인지 이름만으로는 알 수 없으므로 사람이 확인해야 한다.
 */
function ambiguity(sameMatches: Member[]): { ambiguousCount?: number } {
  return sameMatches.length > 1 ? { ambiguousCount: sameMatches.length } : {};
}

function matchOnce(
  normalizedDepositor: string,
  members: Member[],
  coupleGroups: CoupleGroup[],
  transactionDate: Date | null,
  allowSimilar: boolean
): MatchResult {
  // 1. 정확 일치
  const exactMatches = members.filter(
    (m) => m.name && m.name.trim() === normalizedDepositor
  );
  if (exactMatches.length > 0) {
    const [exactMatch] = exactMatches;
    return maybeAttachSpouse(
      {
        memberId: exactMatch.id,
        memberName: exactMatch.name,
        matchType: 'exact',
        confidence: 1.0,
        ...ambiguity(exactMatches),
      },
      coupleGroups,
      transactionDate
    );
  }

  // 2. 부부 한 건 입금: 입금자 명에 같은 부부의 두 회원 이름(전체 또는 성 제외)이 모두 포함된 경우
  for (const couple of coupleGroups) {
    if (couple.members.length < 2) continue;
    const [a, b] = couple.members;
    const nameA = a.clubMember.name?.trim() ?? '';
    const nameB = b.clubMember.name?.trim() ?? '';
    const nameAWithoutSurname = getNameWithoutSurname(nameA);
    const nameBWithoutSurname = getNameWithoutSurname(nameB);

    const aMatched =
      (nameA.length > 0 && depositorContains(normalizedDepositor, nameA)) ||
      (nameAWithoutSurname.length >= 2 &&
        depositorContains(normalizedDepositor, nameAWithoutSurname));
    const bMatched =
      (nameB.length > 0 && depositorContains(normalizedDepositor, nameB)) ||
      (nameBWithoutSurname.length >= 2 &&
        depositorContains(normalizedDepositor, nameBWithoutSurname));

    if (aMatched && bMatched) {
      const primaryMember = couple.members[0];
      const memberIds = couple.members.map((m) => m.clubMemberId);
      return {
        memberId: primaryMember.clubMemberId,
        memberName: primaryMember.clubMember.name,
        matchType: 'couple',
        confidence: 0.95,
        memberIds,
      };
    }
  }

  // 3. 입금자 명에 회원 이름(전체)이 포함된 경우 매칭 (가장 긴 이름 우선)
  const nameIncludedMatches = members.filter(
    (m) =>
      m.name &&
      m.name.trim().length > 0 &&
      normalizedDepositor.includes(m.name.trim())
  );
  if (nameIncludedMatches.length > 0) {
    const best = nameIncludedMatches.reduce((a, b) =>
      (a.name?.length ?? 0) >= (b.name?.length ?? 0) ? a : b
    );
    return maybeAttachSpouse(
      {
        memberId: best.id,
        memberName: best.name,
        matchType: 'partial',
        confidence: 0.85,
        ...ambiguity(
          nameIncludedMatches.filter(
            (m) => m.name?.trim() === best.name?.trim()
          )
        ),
      },
      coupleGroups,
      transactionDate
    );
  }

  // 4. 입금자 명에 회원 이름(성 제외)이 포함된 경우 매칭 (가장 긴 이름 우선)
  const nameWithoutSurnameMatches = members.filter((m) => {
    if (!m.name) return false;
    const withoutSurname = getNameWithoutSurname(m.name);
    return (
      withoutSurname.length >= 2 &&
      depositorContains(normalizedDepositor, withoutSurname)
    );
  });
  if (nameWithoutSurnameMatches.length > 0) {
    const best = nameWithoutSurnameMatches.reduce((a, b) =>
      getNameWithoutSurname(a.name ?? '').length >=
      getNameWithoutSurname(b.name ?? '').length
        ? a
        : b
    );
    return maybeAttachSpouse(
      {
        memberId: best.id,
        memberName: best.name,
        matchType: 'partial',
        confidence: 0.8,
        ...ambiguity(
          nameWithoutSurnameMatches.filter(
            (m) =>
              getNameWithoutSurname(m.name ?? '') ===
              getNameWithoutSurname(best.name ?? '')
          )
        ),
      },
      coupleGroups,
      transactionDate
    );
  }

  // 5. 성 생략 매칭 ("철수" → "김철수", "영희" → "박영희") — 2자 이름인 경우
  if (normalizedDepositor.length === 2) {
    const partialMatches = members.filter(
      (m) =>
        m.name && m.name.length === 3 && m.name.slice(1) === normalizedDepositor
    );
    if (partialMatches.length === 1) {
      return {
        memberId: partialMatches[0].id,
        memberName: partialMatches[0].name,
        matchType: 'partial',
        confidence: 0.9,
      };
    }
  }

  // 6. 부부 배우자 이름 단일 정확 일치 (부부 그룹에서 입금자 명과 동일한 회원)
  // 부부 그룹에서 매칭 가능한 회원 찾기
  for (const couple of coupleGroups) {
    const matchedMember = couple.members.find(
      (m) =>
        m.clubMember.name && m.clubMember.name.trim() === normalizedDepositor
    );
    if (matchedMember) {
      // 부부 그룹의 첫 번째 회원을 대표로 반환
      const primaryMember = couple.members[0];
      return {
        memberId: primaryMember.clubMemberId,
        memberName: primaryMember.clubMember.name,
        matchType: 'couple',
        confidence: 0.95,
      };
    }
  }

  // 7. 유사도 매칭 (Levenshtein distance ≤ 1)
  if (!allowSimilar) return NO_MATCH;

  let bestMatch: Member | null = null;
  let bestDistance = Infinity;

  for (const member of members) {
    if (!member.name) continue;

    const distance = levenshteinDistance(
      normalizedDepositor,
      member.name.trim()
    );
    if (distance < bestDistance && distance <= 1) {
      bestDistance = distance;
      bestMatch = member;
    }
  }

  if (bestMatch) {
    return {
      memberId: bestMatch.id,
      memberName: bestMatch.name,
      matchType: 'similar',
      confidence: 0.7,
    };
  }

  // 8. 매칭 실패
  return NO_MATCH;
}
