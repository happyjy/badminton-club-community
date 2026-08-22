import { describe, expect, it } from '@jest/globals';

import type { EntrySubmissionInput } from '@/types/tournament.types';

import { validateEntrySubmission } from './validation';

const TOURNAMENT = {
  eventTypes: [
    { id: 'et-double', name: '남자복식', playerCount: 2, isActive: true },
    { id: 'et-single', name: '남자단식', playerCount: 1, isActive: true },
    { id: 'et-inactive', name: '혼합복식', playerCount: 2, isActive: false },
  ],
  ageGroups: ['30대', '40대'],
  levels: ['A조', 'B조'],
};

function makeInput(
  overrides: Partial<EntrySubmissionInput> = {}
): EntrySubmissionInput {
  return {
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
        isClubMember: true,
        order: 0,
      },
      {
        key: 'p2',
        name: '김철수',
        gender: '남',
        birthDate: '1988-05-05',
        phoneNumber: '010-3333-4444',
        tshirtSize: 'XL',
        isClubMember: true,
        order: 1,
      },
    ],
    events: [
      {
        eventTypeId: 'et-double',
        ageGroup: '30대',
        level: 'A조',
        playerKeys: ['p1', 'p2'],
      },
    ],
    ...overrides,
  };
}

describe('validateEntrySubmission', () => {
  it('정상 입력이면 ok true', () => {
    expect(validateEntrySubmission(makeInput(), TOURNAMENT)).toEqual({
      ok: true,
    });
  });

  it('개인정보 동의를 안 하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({ privacyAgreed: false }),
      TOURNAMENT
    );
    expect(result).toEqual({
      ok: false,
      error: '개인정보 수집·이용에 동의해야 신청할 수 있습니다.',
    });
  });

  it('입금자명이 비어 있으면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({ depositorName: '   ' }),
      TOURNAMENT
    );
    expect(result).toEqual({ ok: false, error: '입금자명을 입력해주세요.' });
  });

  it('선수가 한 명도 없으면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({ players: [], events: [] }),
      TOURNAMENT
    );
    expect(result).toEqual({
      ok: false,
      error: '선수를 1명 이상 등록해주세요.',
    });
  });

  it('신청 종목이 없으면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({ events: [] }),
      TOURNAMENT
    );
    expect(result).toEqual({
      ok: false,
      error: '종목을 1개 이상 선택해주세요.',
    });
  });

  it('선수 key가 중복되면 거부한다', () => {
    const input = makeInput();
    input.players[1].key = 'p1';
    const result = validateEntrySubmission(input, TOURNAMENT);
    expect(result).toEqual({
      ok: false,
      error: '선수 정보가 올바르지 않습니다.',
    });
  });

  it('이 대회에 없는 종목 ID면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-other',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: ['p1', 'p2'],
          },
        ],
      }),
      TOURNAMENT
    );
    expect(result).toEqual({ ok: false, error: '선택할 수 없는 종목입니다.' });
  });

  it('비활성 종목이면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-inactive',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: ['p1', 'p2'],
          },
        ],
      }),
      TOURNAMENT
    );
    expect(result).toEqual({ ok: false, error: '선택할 수 없는 종목입니다.' });
  });

  it('대회에 없는 연령을 고르면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-double',
            ageGroup: '70대',
            level: 'A조',
            playerKeys: ['p1', 'p2'],
          },
        ],
      }),
      TOURNAMENT
    );
    expect(result).toEqual({ ok: false, error: '선택할 수 없는 연령입니다.' });
  });

  it('대회에 없는 급수를 고르면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-double',
            ageGroup: '30대',
            level: 'Z조',
            playerKeys: ['p1', 'p2'],
          },
        ],
      }),
      TOURNAMENT
    );
    expect(result).toEqual({ ok: false, error: '선택할 수 없는 급수입니다.' });
  });

  it('급수를 쓰지 않는 대회에서는 빈 급수만 허용한다', () => {
    const noLevel = { ...TOURNAMENT, levels: [] };
    const ok = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-double',
            ageGroup: '30대',
            level: '',
            playerKeys: ['p1', 'p2'],
          },
        ],
      }),
      noLevel
    );
    expect(ok).toEqual({ ok: true });

    const bad = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-double',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: ['p1', 'p2'],
          },
        ],
      }),
      noLevel
    );
    expect(bad).toEqual({ ok: false, error: '선택할 수 없는 급수입니다.' });
  });

  it('복식에 선수를 1명만 배정하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-double',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: ['p1'],
          },
        ],
      }),
      TOURNAMENT
    );
    expect(result).toEqual({
      ok: false,
      error: '종목별 선수 인원이 맞지 않습니다. (필요: 2명)',
    });
  });

  it('단식에 선수를 2명 배정하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-single',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: ['p1', 'p2'],
          },
        ],
      }),
      TOURNAMENT
    );
    expect(result).toEqual({
      ok: false,
      error: '종목별 선수 인원이 맞지 않습니다. (필요: 1명)',
    });
  });

  it('신청서에 없는 선수를 배정하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-double',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: ['p1', 'p-ghost'],
          },
        ],
      }),
      TOURNAMENT
    );
    expect(result).toEqual({
      ok: false,
      error: '종목에 배정된 선수를 찾을 수 없습니다.',
    });
  });

  it('같은 종목에 같은 선수를 두 번 배정하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-double',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: ['p1', 'p1'],
          },
        ],
      }),
      TOURNAMENT
    );
    expect(result).toEqual({
      ok: false,
      error: '한 종목에 같은 선수를 중복 배정할 수 없습니다.',
    });
  });

  it('종목·연령·급수가 모두 같으면 중복 신청으로 본다', () => {
    const one = {
      eventTypeId: 'et-double',
      ageGroup: '30대',
      level: 'A조',
      playerKeys: ['p1', 'p2'],
    };
    const result = validateEntrySubmission(
      makeInput({ events: [one, { ...one }] }),
      TOURNAMENT
    );
    expect(result).toEqual({
      ok: false,
      error: '같은 종목을 중복 신청했습니다.',
    });
  });

  it('같은 종목이라도 급수가 다르면 각각 신청할 수 있다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-double',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: ['p1', 'p2'],
          },
          {
            eventTypeId: 'et-double',
            ageGroup: '30대',
            level: 'B조',
            playerKeys: ['p1', 'p2'],
          },
        ],
      }),
      TOURNAMENT
    );
    expect(result).toEqual({ ok: true });
  });

  it('선수 이름이 비어 있으면 거부한다', () => {
    const input = makeInput();
    input.players[0].name = '';
    const result = validateEntrySubmission(input, TOURNAMENT);
    expect(result).toEqual({
      ok: false,
      error: '선수 이름을 모두 입력해주세요.',
    });
  });

  it('한 선수가 여러 종목에 나가는 것은 허용한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          {
            eventTypeId: 'et-double',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: ['p1', 'p2'],
          },
          {
            eventTypeId: 'et-single',
            ageGroup: '40대',
            level: 'B조',
            playerKeys: ['p1'],
          },
        ],
      }),
      TOURNAMENT
    );
    expect(result).toEqual({ ok: true });
  });
});

describe('validateEntrySubmission - 팀당 최소 소속 인원', () => {
  /** 최소 소속 인원 규칙을 쓰는 대회 */
  const RULED = {
    ...TOURNAMENT,
    memberLabel: '당산클럽 소속',
    minClubMembersPerTeam: 1,
  };

  /** p1/p2의 소속 여부를 지정한 신청서를 만든다. */
  function makeInputWithMembers(p1: boolean, p2: boolean) {
    const input = makeInput();
    return {
      ...input,
      players: [
        { ...input.players[0], isClubMember: p1 },
        { ...input.players[1], isClubMember: p2 },
      ],
    };
  }

  it('소속 회원이 1명 이상이면 통과한다', () => {
    const result = validateEntrySubmission(
      makeInputWithMembers(true, false),
      RULED
    );
    expect(result).toEqual({ ok: true });
  });

  it('전원 소속이면 통과한다', () => {
    const result = validateEntrySubmission(
      makeInputWithMembers(true, true),
      RULED
    );
    expect(result).toEqual({ ok: true });
  });

  it('전원 외부면 거부하고 이유를 알려준다', () => {
    const result = validateEntrySubmission(
      makeInputWithMembers(false, false),
      RULED
    );
    expect(result).toEqual({
      ok: false,
      error:
        '한 종목에 당산클럽 소속이 최소 1명 있어야 신청할 수 있습니다. (남자복식 30대 A조)',
    });
  });

  it('제한이 0이면 전원 외부여도 통과한다', () => {
    const result = validateEntrySubmission(makeInputWithMembers(false, false), {
      ...RULED,
      minClubMembersPerTeam: 0,
    });
    expect(result).toEqual({ ok: true });
  });

  it('최소 2명을 요구하면 1명만 소속인 팀을 거부한다', () => {
    const result = validateEntrySubmission(makeInputWithMembers(true, false), {
      ...RULED,
      minClubMembersPerTeam: 2,
    });
    expect(result).toEqual({
      ok: false,
      error:
        '한 종목에 당산클럽 소속이 최소 2명 있어야 신청할 수 있습니다. (남자복식 30대 A조)',
    });
  });

  it('단식은 필요 인원이 1명이므로 소속 1명을 요구한다', () => {
    const input = makeInput();
    const result = validateEntrySubmission(
      {
        ...input,
        players: [{ ...input.players[0], isClubMember: false }],
        events: [
          {
            eventTypeId: 'et-single',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: ['p1'],
          },
        ],
      },
      RULED
    );
    expect(result.ok).toBe(false);
  });
});
