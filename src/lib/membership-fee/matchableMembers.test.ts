import { describe, expect, it } from '@jest/globals';

import { isMatchableAt, matchableMembersWhere } from './matchableMembers';

const d = (iso: string) => new Date(iso);
const member = (over: {
  status?: string;
  leftAt?: Date | null;
  feeObligationStartAt?: Date | null;
}) => ({
  status: 'APPROVED',
  leftAt: null,
  feeObligationStartAt: null,
  ...over,
});

describe('isMatchableAt', () => {
  it('활동 중이고 의무가 시작된 회원은 후보다', () => {
    expect(
      isMatchableAt(
        member({ feeObligationStartAt: d('2026-03-01T03:00:00') }),
        d('2026-03-15T03:00:00')
      )
    ).toBe(true);
  });

  it('의무 시작 정보가 없으면 후보다', () => {
    expect(isMatchableAt(member({}), d('2026-03-15T03:00:00'))).toBe(true);
  });

  it('다음 달부터 의무인 신규 회원은 후보다 (가입비와 첫 달 회비를 미리 낸다)', () => {
    expect(
      isMatchableAt(
        member({ feeObligationStartAt: d('2026-04-01T03:00:00') }),
        d('2026-03-18T03:00:00')
      )
    ).toBe(true);
  });

  it('의무 시작이 두 달 넘게 남았으면 후보가 아니다', () => {
    expect(
      isMatchableAt(
        member({ feeObligationStartAt: d('2026-05-01T03:00:00') }),
        d('2026-03-15T03:00:00')
      )
    ).toBe(false);
  });

  it('탈퇴 회원은 탈퇴한 다음 달까지 후보다 (마지막 달 회비를 늦게 낸다)', () => {
    const left = member({ status: 'LEFT', leftAt: d('2026-04-30T03:00:00') });
    expect(isMatchableAt(left, d('2026-04-10T03:00:00'))).toBe(true);
    expect(isMatchableAt(left, d('2026-05-10T03:00:00'))).toBe(true);
    expect(isMatchableAt(left, d('2026-06-10T03:00:00'))).toBe(false);
  });

  it('탈퇴일을 모르는 탈퇴 회원은 후보로 둔다', () => {
    expect(
      isMatchableAt(member({ status: 'LEFT' }), d('2026-06-10T03:00:00'))
    ).toBe(true);
  });

  it.each(['REJECTED', 'PENDING', 'ON_LEAVE'])(
    '%s 상태는 후보가 아니다',
    (status) => {
      expect(isMatchableAt(member({ status }), d('2026-03-15T03:00:00'))).toBe(
        false
      );
    }
  );
});

describe('matchableMembersWhere', () => {
  it('거래일 범위에 활동한 회원의 조회 조건을 만든다', () => {
    const from = d('2026-01-01T00:00:00Z');
    const to = d('2026-01-31T23:59:59Z');

    expect(matchableMembersWhere(1, from, to)).toEqual({
      clubId: 1,
      status: { in: ['APPROVED', 'LEFT'] },
      OR: [{ leftAt: null }, { leftAt: { gte: from } }],
      AND: [
        {
          OR: [
            { feeObligationStartAt: null },
            { feeObligationStartAt: { lte: to } },
          ],
        },
      ],
    });
  });
});
