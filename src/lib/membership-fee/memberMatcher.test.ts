import { describe, it, expect } from '@jest/globals';

import { matchDepositor, resolveMatchedMemberIds } from './memberMatcher';

interface CoupleMemberFixture {
  id: number;
  name: string;
  feeObligationStartAt?: Date | null;
  leftAt?: Date | null;
  leavePeriods?: {
    startYear: number;
    startMonth: number;
    endYear?: number | null;
    endMonth?: number | null;
  }[];
}

function buildCoupleGroup(
  groupId: number,
  a: CoupleMemberFixture,
  b: CoupleMemberFixture
) {
  const toMember = (m: CoupleMemberFixture) => ({
    clubMemberId: m.id,
    clubMember: {
      id: m.id,
      name: m.name,
      feeObligationStartAt: m.feeObligationStartAt ?? null,
      leftAt: m.leftAt ?? null,
      leavePeriods: m.leavePeriods ?? [],
    },
  });
  return { id: groupId, members: [toMember(a), toMember(b)] };
}

describe('matchDepositor — 부부 자동 추가', () => {
  const husband = { id: 1, name: '홍길동' };
  const wife = { id: 2, name: '성춘향' };
  const members = [husband, wife];
  const transactionDate = new Date(2026, 4, 15); // 2026-05-15

  it('본인 exact 매칭 + 배우자도 의무월이면 couple로 격상', () => {
    const couple = buildCoupleGroup(10, husband, wife);
    const result = matchDepositor('홍길동', members, [couple], transactionDate);
    expect(result.matchType).toBe('couple');
    expect(result.memberIds).toEqual([1, 2]);
  });

  it('본인 partial 매칭(이름 포함)에서도 배우자가 의무월이면 couple로 격상', () => {
    const couple = buildCoupleGroup(10, husband, wife);
    const result = matchDepositor(
      '홍길동님',
      members,
      [couple],
      transactionDate
    );
    expect(result.matchType).toBe('couple');
    expect(result.memberIds).toEqual([1, 2]);
  });

  it('본인 partial 매칭(성 제외 포함)에서도 배우자가 의무월이면 couple로 격상', () => {
    const couple = buildCoupleGroup(10, husband, wife);
    const result = matchDepositor('길동', members, [couple], transactionDate);
    expect(result.matchType).toBe('couple');
    expect(result.memberIds).toEqual([1, 2]);
  });

  it('배우자가 탈퇴했으면 자동 추가하지 않음', () => {
    const couple = buildCoupleGroup(
      10,
      husband,
      { ...wife, leftAt: new Date(2026, 0, 31) } // 1월 탈퇴
    );
    const result = matchDepositor('홍길동', members, [couple], transactionDate);
    expect(result.matchType).toBe('exact');
    expect(result.memberIds).toBeUndefined();
    expect(result.memberId).toBe(1);
  });

  it('배우자가 입금일 월에 휴회 중이면 자동 추가하지 않음', () => {
    const couple = buildCoupleGroup(10, husband, {
      ...wife,
      leavePeriods: [
        { startYear: 2026, startMonth: 4, endYear: 2026, endMonth: 6 },
      ],
    });
    const result = matchDepositor('홍길동', members, [couple], transactionDate);
    expect(result.matchType).toBe('exact');
    expect(result.memberId).toBe(1);
  });

  it('배우자 가입일이 입금일 이후면(미가입 상태) 자동 추가하지 않음', () => {
    const couple = buildCoupleGroup(
      10,
      husband,
      { ...wife, feeObligationStartAt: new Date(2026, 5, 1) } // 6월 가입
    );
    const result = matchDepositor('홍길동', members, [couple], transactionDate);
    expect(result.matchType).toBe('exact');
    expect(result.memberId).toBe(1);
  });

  it('본인이 입금일 월에 휴회 중이면 (배우자가 의무여도) 자동 추가하지 않음', () => {
    const couple = buildCoupleGroup(
      10,
      {
        ...husband,
        leavePeriods: [
          { startYear: 2026, startMonth: 4, endYear: 2026, endMonth: 6 },
        ],
      },
      wife
    );
    const result = matchDepositor('홍길동', members, [couple], transactionDate);
    expect(result.matchType).toBe('exact');
    expect(result.memberId).toBe(1);
  });

  it('부부 그룹에 속하지 않은 회원은 단독 매칭 유지', () => {
    const result = matchDepositor('홍길동', members, [], transactionDate);
    expect(result.matchType).toBe('exact');
    expect(result.memberIds).toBeUndefined();
  });

  it('부부 두 사람 이름이 모두 들어 있는 입금자 명은 (의무 무관) 기존 부부 매칭으로 처리', () => {
    // 기존 2단계 로직: 두 이름 모두 포함된 입금자 명은 항상 couple 매칭.
    // 이 흐름은 새 후처리와 무관하게 그대로 유지되어야 함.
    const couple = buildCoupleGroup(10, husband, wife);
    const result = matchDepositor(
      '홍길동성춘향',
      members,
      [couple],
      transactionDate
    );
    expect(result.matchType).toBe('couple');
    expect(result.memberIds).toEqual([1, 2]);
  });

  it('transactionDate 미전달 시 의무 검증 없이 부부 자동 추가 (하위 호환)', () => {
    const couple = buildCoupleGroup(10, husband, wife);
    const result = matchDepositor('홍길동', members, [couple]);
    expect(result.matchType).toBe('couple');
    expect(result.memberIds).toEqual([1, 2]);
  });
});

describe('matchDepositor — 이름 토큰 매칭', () => {
  const members = [
    { id: 1, name: '가나다' },
    { id: 2, name: '마바사' },
    { id: 3, name: '아자차' },
  ];

  it('월·회비가 붙은 입금자명도 이름만 떼어 정확 매칭한다', () => {
    expect(matchDepositor('가나다3월회비', members)).toMatchObject({
      memberId: 1,
      matchType: 'exact',
      confidence: 1,
    });
    expect(matchDepositor('26.3월가나다', members).matchType).toBe('exact');
  });

  it('이름에 오타가 한 글자 있으면 유사 매칭한다', () => {
    const result = matchDepositor('가나라3월회비', members);

    expect(result.memberId).toBe(1);
    expect(result.matchType).toBe('similar');
  });

  it('이름으로 보기에 긴 글자는 유사 매칭하지 않는다', () => {
    expect(matchDepositor('가나다라', members).matchType).not.toBe('similar');
    expect(matchDepositor('입출금통장 이자', members).matchType).toBe('none');
  });

  it('이름이 없으면 매칭하지 않는다', () => {
    expect(matchDepositor('12345', members).matchType).toBe('none');
    expect(matchDepositor('', members).matchType).toBe('none');
  });
});

describe('matchDepositor — 배우자 자동 추가 표시', () => {
  const husband = { id: 1, name: '홍길동' };
  const wife = { id: 2, name: '성춘향' };
  const members = [husband, wife];
  const couple = buildCoupleGroup(10, husband, wife);
  const transactionDate = new Date(2026, 4, 15);

  it('한 사람 이름만으로 배우자가 붙으면 자동 추가로 표시한다', () => {
    const result = matchDepositor('홍길동', members, [couple], transactionDate);

    expect(result.memberIds).toEqual([1, 2]);
    expect(result.spouseAutoAttached).toBe(true);
  });

  it('두 사람 이름이 모두 적혀 있으면 자동 추가가 아니다', () => {
    const result = matchDepositor(
      '홍길동성춘향5월',
      members,
      [couple],
      transactionDate
    );

    expect(result.memberIds).toEqual([1, 2]);
    expect(result.spouseAutoAttached).toBeFalsy();
  });
});

describe('resolveMatchedMemberIds', () => {
  const rates = { regularMonthly: 25000, coupleMonthly: 45000 };
  const autoAttached = {
    memberId: 1,
    memberName: '홍길동',
    matchType: 'couple' as const,
    confidence: 1,
    memberIds: [1, 2],
    spouseAutoAttached: true,
  };

  it('자동으로 붙은 배우자는 입금액이 개인 단가 배수면 뗀다', () => {
    expect(resolveMatchedMemberIds(autoAttached, 25000, rates)).toEqual([1]);
    expect(resolveMatchedMemberIds(autoAttached, 50000, rates)).toEqual([1]);
  });

  it('입금액이 부부 단가 배수면 배우자를 둔다', () => {
    expect(resolveMatchedMemberIds(autoAttached, 45000, rates)).toEqual([1, 2]);
    expect(resolveMatchedMemberIds(autoAttached, 90000, rates)).toEqual([1, 2]);
  });

  it('어느 단가의 배수도 아니면 배우자를 둔다 (부부 단가 기준으로 검토하게)', () => {
    expect(resolveMatchedMemberIds(autoAttached, 40000, rates)).toEqual([1, 2]);
  });

  it('두 이름이 모두 적힌 매칭은 금액과 무관하게 둘 다 둔다', () => {
    const bothNamed = { ...autoAttached, spouseAutoAttached: undefined };

    expect(resolveMatchedMemberIds(bothNamed, 25000, rates)).toEqual([1, 2]);
  });

  it('한 명 매칭과 매칭 실패도 그대로 돌려준다', () => {
    const single = {
      memberId: 3,
      memberName: '가나다',
      matchType: 'exact' as const,
      confidence: 1,
    };
    const none = {
      memberId: null,
      memberName: null,
      matchType: 'none' as const,
      confidence: 0,
    };

    expect(resolveMatchedMemberIds(single, 25000, rates)).toEqual([3]);
    expect(resolveMatchedMemberIds(none, 25000, rates)).toEqual([]);
  });
});

describe('matchDepositor — 동명이인', () => {
  const twins = [
    { id: 10, name: '김민수' },
    { id: 11, name: '김민수' },
    { id: 12, name: '이영희' },
  ];

  it('이름이 정확히 같은 회원이 둘이면 몇 명인지 알린다', () => {
    expect(matchDepositor('김민수', twins)).toMatchObject({
      memberId: 10,
      matchType: 'exact',
      ambiguousCount: 2,
    });
  });

  it('월을 붙여 쓴 입금자명도 같은 이름이 둘이면 알린다', () => {
    expect(matchDepositor('김민수5월', twins).ambiguousCount).toBe(2);
  });

  it('성을 뺀 이름으로 찾았을 때도 같은 이름이 둘이면 알린다', () => {
    expect(matchDepositor('민수 회비', twins).ambiguousCount).toBe(2);
  });

  it('같은 이름이 한 명뿐이면 알리지 않는다', () => {
    expect(matchDepositor('이영희', twins).ambiguousCount).toBeUndefined();
    expect(matchDepositor('이영희5월', twins).ambiguousCount).toBeUndefined();
  });
});
