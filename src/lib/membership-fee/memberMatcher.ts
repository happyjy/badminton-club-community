import { MatchResult } from '@/types/membership-fee.types';

interface Member {
  id: number;
  name: string | null;
}

interface CoupleGroup {
  id: number;
  members: {
    clubMemberId: number;
    clubMember: {
      id: number;
      name: string | null;
    };
  }[];
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

export function matchDepositor(
  depositorName: string,
  members: Member[],
  coupleGroups: CoupleGroup[] = []
): MatchResult {
  if (!depositorName || depositorName.trim() === '') {
    return {
      memberId: null,
      memberName: null,
      matchType: 'none',
      confidence: 0,
    };
  }

  const normalizedDepositor = depositorName.trim();

  // 1. 정확 일치
  const exactMatch = members.find(
    (m) => m.name && m.name.trim() === normalizedDepositor
  );
  if (exactMatch) {
    return {
      memberId: exactMatch.id,
      memberName: exactMatch.name,
      matchType: 'exact',
      confidence: 1.0,
    };
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
      return {
        memberId: primaryMember.clubMemberId,
        memberName: primaryMember.clubMember.name,
        matchType: 'couple',
        confidence: 0.95,
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
    return {
      memberId: best.id,
      memberName: best.name,
      matchType: 'partial',
      confidence: 0.85,
    };
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
    return {
      memberId: best.id,
      memberName: best.name,
      matchType: 'partial',
      confidence: 0.8,
    };
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
  return {
    memberId: null,
    memberName: null,
    matchType: 'none',
    confidence: 0,
  };
}

export function findCoupleGroup(
  memberId: number,
  coupleGroups: CoupleGroup[]
): CoupleGroup | undefined {
  return coupleGroups.find((g) =>
    g.members.some((m) => m.clubMemberId === memberId)
  );
}
