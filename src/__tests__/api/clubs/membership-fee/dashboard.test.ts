import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import handler from '@/pages/api/clubs/[id]/membership-fee/dashboard';

import { buildRes, CLUB_ID, fakeDb } from './fakeFeeDb';

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/prisma', () => ({
  prisma:
    jest.requireActual<typeof import('./fakeFeeDb')>('./fakeFeeDb').fakeDb
      .prisma,
}));

jest.mock('@/lib/session', () => ({
  withAuth:
    (inner: (req: unknown, res: unknown) => unknown) =>
    (req: Record<string, unknown>, res: unknown) => {
      req.user = { id: 7 };
      return inner(req, res);
    },
}));

interface Member {
  id: number;
  name: string;
  type: string;
  couplePartnerName: string | null;
  payments: Record<number, boolean>;
  paidCount: number;
  totalMonths: number;
  firstObligationMonth: number;
  obligationMonths: number[];
  leaveMonths: number[];
  feeObligationStartMonth: string | null;
  isLeft: boolean;
  leftMonth?: number;
  leftAtFormatted: string | null;
}

async function dashboard(year = 2026) {
  const res = buildRes();
  await handler(
    {
      method: 'GET',
      query: { id: String(CLUB_ID), year: String(year) },
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  const body = res.body as {
    data: {
      members: Member[];
      summary: {
        totalMembers: number;
        exemptMembers: number;
        coupleGroups: number;
        monthlyStats: {
          month: number;
          paidCount: number;
          totalCount: number;
          amount: number;
        }[];
        yearTotal: number;
      };
      feeSettings: { regularAmount: number; coupleAmount: number };
      latestUpload: {
        pendingWork: {
          unconfirmed: number;
          unmatched: number;
          needsReview: number;
        };
      };
    };
  };
  const member = (name: string) =>
    body.data.members.find((m) => m.name === name) as Member;
  return { statusCode: res.statusCode, data: body.data, member };
}

/**
 * 가나다: 3월부터 의무, 3·4·5월 납부, 7~8월 휴회
 * 나다라: 면제
 * 다라마 + 라마바: 부부, 다라마만 1월 납부
 * 마바사: 8월 탈퇴, 1~3월 납부
 */
beforeEach(() => {
  fakeDb.reset();
  // 테스트의 관리자 회원은 집계에서 헷갈리지 않게 면제로 둔다
  fakeDb.state.exemptions.push({ clubMemberId: 900, year: 2026 });

  fakeDb.addMember({
    id: 1,
    name: '가나다',
    feeObligationStartAt: new Date(2026, 2, 1),
  });
  fakeDb.addMember({ id: 2, name: '나다라' });
  fakeDb.addMember({ id: 3, name: '다라마' });
  fakeDb.addMember({ id: 4, name: '라마바' });
  fakeDb.addMember({
    id: 5,
    name: '마바사',
    status: 'LEFT',
    leftAt: new Date(2026, 7, 20),
  });
  fakeDb.addCouple(3, 4);
  fakeDb.state.exemptions.push({ clubMemberId: 2, year: 2026 });
  fakeDb.state.leaves.push({
    clubMemberId: 1,
    startYear: 2026,
    startMonth: 7,
    endYear: 2026,
    endMonth: 8,
    reason: '무릎 부상',
  });
  for (const month of [3, 4, 5]) {
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month });
  }
  fakeDb.addPayment({ clubMemberId: 3, year: 2026, month: 1, amount: 22500 });
  for (const month of [1, 2, 3]) {
    fakeDb.addPayment({ clubMemberId: 5, year: 2026, month });
  }
});

describe('GET /api/clubs/[id]/membership-fee/dashboard', () => {
  it('회원마다 의무월·휴회월·납부 여부를 본인 기준으로 계산한다', async () => {
    const { statusCode, member } = await dashboard();

    expect(statusCode).toBe(200);
    expect(member('가나다')).toMatchObject({
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
    expect(member('가나다').payments).toMatchObject({
      1: false,
      3: true,
      5: true,
      6: false,
      7: false,
    });
  });

  it('면제·부부·탈퇴 회원을 구분한다', async () => {
    const { member } = await dashboard();

    expect(member('나다라').type).toBe('exempt');
    expect(member('다라마')).toMatchObject({
      type: 'couple',
      couplePartnerName: '라마바',
      paidCount: 1,
      totalMonths: 12,
    });
    expect(member('라마바')).toMatchObject({
      type: 'couple',
      couplePartnerName: '다라마',
      paidCount: 0,
    });
    expect(member('마바사')).toMatchObject({
      isLeft: true,
      leftMonth: 8,
      leftAtFormatted: '2026.08',
      obligationMonths: [1, 2, 3, 4, 5, 6, 7, 8],
      paidCount: 3,
    });
  });

  it('월별 납부 인원·금액과 요약을 낸다', async () => {
    const { data } = await dashboard();

    expect(data.summary).toMatchObject({
      totalMembers: 6,
      exemptMembers: 2,
      coupleGroups: 1,
      yearTotal: 25000 * 6 + 22500,
    });
    // 3월: 가나다·다라마·라마바·마바사가 의무, 가나다·마바사가 납부
    expect(data.summary.monthlyStats[2]).toEqual({
      month: 3,
      paidCount: 2,
      totalCount: 4,
      amount: 50000,
    });
    // 7월: 가나다는 휴회라 의무 인원에서 빠진다
    expect(data.summary.monthlyStats[6]).toMatchObject({ totalCount: 3 });
    expect(data.feeSettings).toMatchObject({
      regularAmount: 25000,
      coupleAmount: 45000,
    });
  });

  it('회원을 이름순으로 돌려준다', async () => {
    const { data } = await dashboard();

    expect(data.members.map((m) => m.name)).toEqual([
      '가나다',
      '관리자',
      '나다라',
      '다라마',
      '라마바',
      '마바사',
    ]);
  });

  describe('남은 일 (latestUpload.pendingWork)', () => {
    it('열려 있는 회비 건을 미확정·미매칭·검토 필요로 센다', async () => {
      // 가나다(3~5월 납부): 한 달 치 — 바로 확정할 수 있다
      fakeDb.addRecord({ status: 'MATCHED', memberIds: [1], amount: 25000 });
      // 가나다: 한 달 단가에 못 미친다 — 매칭됐지만 검토가 필요하다
      fakeDb.addRecord({ status: 'MATCHED', memberIds: [1], amount: 20000 });
      // 회원을 못 찾은 회비
      fakeDb.addRecord({ status: 'PENDING', depositorName: '모르는이' });
      // 남은 일이 아닌 것: 확정된 건, 건너뛴 행사, 재무가 건너뛴 회비
      fakeDb.addRecord({ status: 'CONFIRMED', memberIds: [1] });
      fakeDb.addRecord({ status: 'SKIPPED', kind: 'EVENT', amount: 15000 });
      fakeDb.addRecord({ status: 'SKIPPED', memberIds: [1], amount: 20000 });

      const { data } = await dashboard();

      expect(data.latestUpload.pendingWork).toEqual({
        unconfirmed: 2,
        unmatched: 1,
        needsReview: 1,
      });
    });

    it('열려 있는 건이 없으면 모두 0이다', async () => {
      const { data } = await dashboard();

      expect(data.latestUpload.pendingWork).toEqual({
        unconfirmed: 0,
        unmatched: 0,
        needsReview: 0,
      });
    });

    it('보고 있는 해와 상관없이 클럽 전체를 센다', async () => {
      fakeDb.addRecord({ status: 'PENDING', depositorName: '모르는이' });

      const { data } = await dashboard(2025);

      expect(data.latestUpload.pendingWork.unmatched).toBe(1);
    });
  });
});
