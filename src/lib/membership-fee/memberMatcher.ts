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

  // 2. 성 생략 매칭 ("철수" → "김철수", "영희" → "박영희")
  // 2자 이름인 경우, 성 생략 가능성 체크
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

  // 3. 부부 배우자 이름 매칭
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

  // 4. 유사도 매칭 (Levenshtein distance ≤ 1)
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

  // 5. 매칭 실패
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
