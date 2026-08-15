import { describe, expect, it } from '@jest/globals';

import {
  entrySubmissionSchema,
  tournamentInputSchema,
} from './tournament.schema';

const VALID_TOURNAMENT = {
  title: '2026 시장기 배드민턴 대회',
  hostName: '○○시 배드민턴협회',
  description: '참가비 종목당 3만원',
  tournamentDate: '2026-09-20',
  location: '○○체육관',
  applyStartAt: '2026-08-20T00:00:00.000Z',
  applyDeadline: '2026-09-01T00:00:00.000Z',
  status: 'OPEN',
  useTeamName: true,
  tshirtSizes: ['S', 'M', 'L'],
  bankAccount: '○○은행 123-456',
  eventOptions: [
    {
      eventType: '남자복식',
      ageGroup: '30대부',
      level: 'A조',
      playerCount: 2,
      fee: 30000,
      order: 0,
    },
  ],
};

describe('tournamentInputSchema', () => {
  it('정상 입력을 통과시킨다', () => {
    expect(tournamentInputSchema.safeParse(VALID_TOURNAMENT).success).toBe(
      true
    );
  });

  it('대회명이 없으면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('종목 옵션이 비어 있으면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventOptions: [],
    });
    expect(result.success).toBe(false);
  });

  it('마감일이 시작일보다 빠르면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      applyStartAt: '2026-09-10T00:00:00.000Z',
      applyDeadline: '2026-09-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('종목 조합이 중복되면 거부한다', () => {
    const option = VALID_TOURNAMENT.eventOptions[0];
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventOptions: [option, { ...option, order: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('playerCount가 1도 2도 아니면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventOptions: [{ ...VALID_TOURNAMENT.eventOptions[0], playerCount: 3 }],
    });
    expect(result.success).toBe(false);
  });

  it('참가비가 음수면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventOptions: [{ ...VALID_TOURNAMENT.eventOptions[0], fee: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('무료 대회(참가비 0원)를 허용한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventOptions: [{ ...VALID_TOURNAMENT.eventOptions[0], fee: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it('applyStartAt이 없어도 통과한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      applyStartAt: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('entrySubmissionSchema', () => {
  const VALID_ENTRY = {
    depositorName: '홍길동',
    teamName: null,
    privacyAgreed: true,
    players: [
      {
        key: 'p1',
        name: '홍길동',
        gender: '남',
        birthDate: '1990-01-01',
        phoneNumber: '010-1111-2222',
        tshirtSize: 'L',
        order: 0,
      },
    ],
    events: [{ eventOptionId: 'opt-1', playerKeys: ['p1'] }],
  };

  it('정상 입력을 통과시킨다', () => {
    expect(entrySubmissionSchema.safeParse(VALID_ENTRY).success).toBe(true);
  });

  it('fee나 totalFee를 보내도 스키마가 걸러낸다', () => {
    const parsed = entrySubmissionSchema.parse({
      ...VALID_ENTRY,
      totalFee: 999999,
      events: [{ eventOptionId: 'opt-1', playerKeys: ['p1'], fee: 1 }],
    });
    expect(parsed).not.toHaveProperty('totalFee');
    expect(parsed.events[0]).not.toHaveProperty('fee');
  });

  it('privacyAgreed가 false면 거부한다', () => {
    const result = entrySubmissionSchema.safeParse({
      ...VALID_ENTRY,
      privacyAgreed: false,
    });
    expect(result.success).toBe(false);
  });

  it('선수가 없으면 거부한다', () => {
    const result = entrySubmissionSchema.safeParse({
      ...VALID_ENTRY,
      players: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('eventOption.id 정규화', () => {
  it('빈 문자열 id는 undefined로 바뀐다 (신규 생성으로 분기되도록)', () => {
    const parsed = tournamentInputSchema.parse({
      ...VALID_TOURNAMENT,
      eventOptions: [{ ...VALID_TOURNAMENT.eventOptions[0], id: '' }],
    });
    expect(parsed.eventOptions[0].id).toBeUndefined();
  });

  it('실제 id는 그대로 유지된다 (기존 종목 수정으로 분기되도록)', () => {
    const parsed = tournamentInputSchema.parse({
      ...VALID_TOURNAMENT,
      eventOptions: [{ ...VALID_TOURNAMENT.eventOptions[0], id: 'opt-abc' }],
    });
    expect(parsed.eventOptions[0].id).toBe('opt-abc');
  });
});
