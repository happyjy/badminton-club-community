import { describe, expect, it } from '@jest/globals';

import {
  buildMemberYearStatus,
  type MemberYearInput,
  sortForExport,
} from './memberYearStatus';

/** 2026년 10월 10일에 본 2026년 현황 */
const today = new Date(2026, 9, 10);

/** 3월부터 의무, 3·4·5월 납부 */
const input = (over: Partial<MemberYearInput> = {}): MemberYearInput => ({
  id: 1,
  userId: 11,
  name: '가나다',
  status: 'APPROVED',
  feeObligationStartAt: new Date(2026, 2, 1),
  leftAt: null,
  position: null,
  positionOrder: null,
  isExempt: false,
  isCouple: false,
  couplePartnerName: null,
  leavePeriods: [],
  paidMonths: new Set([3, 4, 5]),
  ...over,
});

const status = (over: Partial<MemberYearInput> = {}, year = 2026) =>
  buildMemberYearStatus(year, input(over), today);

describe('buildMemberYearStatus — 칸의 상태', () => {
  it('의무 시작 전은 해당없음, 납부한 달은 완납이다', () => {
    const { cells } = status();

    expect(cells[1]).toBe('NONE');
    expect(cells[2]).toBe('NONE');
    expect(cells[3]).toBe('PAID');
    expect(cells[5]).toBe('PAID');
  });

  it('안 낸 달은 이번 달까지 미납이고, 아직 오지 않은 달은 빈칸이다', () => {
    const { cells } = status();

    expect(cells[6]).toBe('UNPAID');
    expect(cells[10]).toBe('UNPAID');
    expect(cells[11]).toBe('FUTURE');
    expect(cells[12]).toBe('FUTURE');
  });

  it('미리 낸 달은 아직 오지 않았어도 완납이다', () => {
    const { cells } = status({ paidMonths: new Set([3, 4, 5, 12]) });

    expect(cells[12]).toBe('PAID');
  });

  it('휴회한 달은 병가이고 사유를 함께 싣는다 (아직 오지 않은 달도)', () => {
    const { cells, leaveReasons } = status({
      leavePeriods: [
        {
          startYear: 2026,
          startMonth: 6,
          endYear: 2026,
          endMonth: 7,
          reason: '무릎 부상',
        },
        { startYear: 2026, startMonth: 11, endYear: 2026, endMonth: 12 },
      ],
    });

    expect(cells[6]).toBe('LEAVE');
    expect(cells[7]).toBe('LEAVE');
    expect(leaveReasons[6]).toBe('무릎 부상');
    expect(cells[8]).toBe('UNPAID');
    expect(cells[11]).toBe('LEAVE');
    expect(leaveReasons[11]).toBeNull();
  });

  it('탈퇴한 달까지는 의무이고 그 뒤는 해당없음이다', () => {
    const { cells } = status({
      status: 'LEFT',
      leftAt: new Date(2026, 7, 20),
    });

    expect(cells[8]).toBe('UNPAID');
    expect(cells[9]).toBe('NONE');
    expect(cells[12]).toBe('NONE');
  });

  it('면제 회원은 이번 달까지 면제로 표시하고, 실제로 낸 달은 완납으로 둔다', () => {
    const { cells } = status({
      isExempt: true,
      feeObligationStartAt: new Date(2025, 0, 1),
      paidMonths: new Set([1, 2, 3]),
    });

    expect(cells[1]).toBe('PAID');
    expect(cells[3]).toBe('PAID');
    expect(cells[4]).toBe('EXEMPT');
    expect(cells[10]).toBe('EXEMPT');
    expect(cells[11]).toBe('FUTURE');
  });

  it('지난 해를 보면 안 낸 달은 모두 미납이다', () => {
    const { cells } = status(
      { feeObligationStartAt: new Date(2024, 0, 1), paidMonths: new Set() },
      2025
    );

    expect(Object.values(cells).every((cell) => cell === 'UNPAID')).toBe(true);
  });

  it('의무가 없는 달에 납부가 걸려 있으면 따로 알려 준다', () => {
    const { orphanPaidMonths, cells } = status({
      paidMonths: new Set([2, 3, 4, 6]),
      leavePeriods: [
        { startYear: 2026, startMonth: 6, endYear: 2026, endMonth: 6 },
      ],
    });

    expect(cells[6]).toBe('LEAVE');
    expect(orphanPaidMonths).toEqual([2, 6]);
  });
});

describe('buildMemberYearStatus — 대시보드가 쓰는 값', () => {
  it('의무월·휴회월·납부 수를 본인 기준으로 계산한다', () => {
    const result = status({
      leavePeriods: [
        { startYear: 2026, startMonth: 7, endYear: 2026, endMonth: 8 },
      ],
    });

    expect(result).toMatchObject({
      id: 1,
      userId: 11,
      name: '가나다',
      type: 'regular',
      couplePartnerName: null,
      firstObligationMonth: 3,
      obligationMonths: [3, 4, 5, 6, 9, 10, 11, 12],
      leaveMonths: [7, 8],
      totalMonths: 8,
      paidCount: 3,
      feeObligationStartMonth: '2026.03',
      isLeft: false,
      leftAtFormatted: null,
    });
    expect(result.leftMonth).toBeUndefined();
    expect(result.payments[3]).toBe(true);
    expect(result.payments[6]).toBe(false);
    expect(result.payments[1]).toBe(false);
  });

  it('면제·부부·탈퇴를 구분한다', () => {
    expect(status({ isExempt: true, isCouple: true }).type).toBe('exempt');
    expect(
      status({ isCouple: true, couplePartnerName: '라마바' })
    ).toMatchObject({ type: 'couple', couplePartnerName: '라마바' });
    expect(
      status({ status: 'LEFT', leftAt: new Date(2026, 7, 20) })
    ).toMatchObject({ isLeft: true, leftMonth: 8, leftAtFormatted: '2026.08' });
  });

  it('탈퇴하지 않은 회원의 탈퇴일은 보지 않는다', () => {
    // 복귀한 회원에게 예전 탈퇴일이 남아 있는 경우
    const result = status({ leftAt: new Date(2026, 3, 1) });

    expect(result.isLeft).toBe(false);
    expect(result.obligationMonths).toContain(12);
  });

  it('이름이 없으면 자리표시 이름을 쓰고, 직책을 그대로 싣는다', () => {
    expect(status({ name: null }).name).toBe('(이름 없음)');
    expect(status({ position: '총무', positionOrder: 3 })).toMatchObject({
      position: '총무',
      positionOrder: 3,
    });
  });
});

describe('sortForExport', () => {
  it('직책이 있는 회원을 정한 순서대로 먼저, 나머지는 가나다순으로 둔다', () => {
    const rows = [
      status({ id: 3, name: '다라마' }),
      status({ id: 2, name: '나다라', position: '총무', positionOrder: 2 }),
      status({ id: 5, name: '하하하', position: '이사' }),
      status({ id: 1, name: '마바사', position: '회장', positionOrder: 1 }),
      status({ id: 4, name: '가나다' }),
    ];

    expect(sortForExport(rows).map((row) => row.name)).toEqual([
      '마바사',
      '나다라',
      '하하하',
      '가나다',
      '다라마',
    ]);
  });
});
