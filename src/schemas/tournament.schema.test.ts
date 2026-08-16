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
  ageGroups: ['30대', '40대'],
  levels: ['A조', 'B조'],
  eventTypes: [{ name: '남자복식', playerCount: 2, fee: 30000, order: 0 }],
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

  it('종목이 비어 있으면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventTypes: [],
    });
    expect(result.success).toBe(false);
  });

  it('연령이 비어 있으면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      ageGroups: [],
    });
    expect(result.success).toBe(false);
  });

  it('급수는 비어 있어도 통과한다 (급수 없는 대회)', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      levels: [],
    });
    expect(result.success).toBe(true);
  });

  it('마감일이 시작일보다 빠르면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      applyStartAt: '2026-09-10T00:00:00.000Z',
      applyDeadline: '2026-09-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('종목명이 중복되면 거부한다', () => {
    const eventType = VALID_TOURNAMENT.eventTypes[0];
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventTypes: [eventType, { ...eventType, order: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('연령이 중복되면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      ageGroups: ['30대', '30대'],
    });
    expect(result.success).toBe(false);
  });

  it('playerCount가 1도 2도 아니면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventTypes: [{ ...VALID_TOURNAMENT.eventTypes[0], playerCount: 3 }],
    });
    expect(result.success).toBe(false);
  });

  it('참가비가 음수면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventTypes: [{ ...VALID_TOURNAMENT.eventTypes[0], fee: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('무료 대회(참가비 0원)를 허용한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventTypes: [{ ...VALID_TOURNAMENT.eventTypes[0], fee: 0 }],
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
    events: [
      {
        eventTypeId: 'et-1',
        ageGroup: '30대',
        level: 'A조',
        playerKeys: ['p1'],
      },
    ],
  };

  it('정상 입력을 통과시킨다', () => {
    expect(entrySubmissionSchema.safeParse(VALID_ENTRY).success).toBe(true);
  });

  it('fee나 totalFee를 보내도 스키마가 걸러낸다', () => {
    const parsed = entrySubmissionSchema.parse({
      ...VALID_ENTRY,
      totalFee: 999999,
      events: [
        {
          eventTypeId: 'et-1',
          ageGroup: '30대',
          level: 'A조',
          playerKeys: ['p1'],
          fee: 1,
        },
      ],
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

  describe('birthDate 검증', () => {
    const withBirthDate = (birthDate: string) => ({
      ...VALID_ENTRY,
      players: [{ ...VALID_ENTRY.players[0], birthDate }],
    });

    it('숫자 8자리로 보내면 저장 포맷으로 정규화한다', () => {
      const parsed = entrySubmissionSchema.parse(withBirthDate('19900315'));
      expect(parsed.players[0].birthDate).toBe('1990-03-15');
    });

    it('저장 포맷으로 보내면 그대로 유지한다', () => {
      const parsed = entrySubmissionSchema.parse(withBirthDate('1990-03-15'));
      expect(parsed.players[0].birthDate).toBe('1990-03-15');
    });

    it('형식만 맞고 실재하지 않는 날짜를 거부한다', () => {
      expect(
        entrySubmissionSchema.safeParse(withBirthDate('99999999')).success
      ).toBe(false);
      expect(
        entrySubmissionSchema.safeParse(withBirthDate('1990-02-30')).success
      ).toBe(false);
    });

    it('미래 생년월일을 거부한다', () => {
      const nextYear = new Date().getFullYear() + 1;
      expect(
        entrySubmissionSchema.safeParse(withBirthDate(`${nextYear}-01-01`))
          .success
      ).toBe(false);
    });
  });
});

describe('eventType.id 정규화', () => {
  it('빈 문자열 id는 undefined로 바뀐다 (신규 생성으로 분기되도록)', () => {
    const parsed = tournamentInputSchema.parse({
      ...VALID_TOURNAMENT,
      eventTypes: [{ ...VALID_TOURNAMENT.eventTypes[0], id: '' }],
    });
    expect(parsed.eventTypes[0].id).toBeUndefined();
  });

  it('실제 id는 그대로 유지된다 (기존 종목 수정으로 분기되도록)', () => {
    const parsed = tournamentInputSchema.parse({
      ...VALID_TOURNAMENT,
      eventTypes: [{ ...VALID_TOURNAMENT.eventTypes[0], id: 'et-abc' }],
    });
    expect(parsed.eventTypes[0].id).toBe('et-abc');
  });
});
