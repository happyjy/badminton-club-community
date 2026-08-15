import { describe, expect, it } from '@jest/globals';

import { isAcceptingEntries, resolveTournamentStatus } from './status';

const NOW = new Date('2026-08-16T12:00:00Z');

describe('resolveTournamentStatus', () => {
  it('DRAFT는 마감일과 무관하게 DRAFT를 유지한다', () => {
    const result = resolveTournamentStatus(
      {
        status: 'DRAFT',
        applyStartAt: null,
        applyDeadline: new Date('2026-09-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('DRAFT');
  });

  it('관리자가 수동 마감하면 마감일 이전이어도 CLOSED', () => {
    const result = resolveTournamentStatus(
      {
        status: 'CLOSED',
        applyStartAt: null,
        applyDeadline: new Date('2026-09-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('CLOSED');
  });

  it('마감일이 지나면 OPEN이어도 CLOSED', () => {
    const result = resolveTournamentStatus(
      {
        status: 'OPEN',
        applyStartAt: null,
        applyDeadline: new Date('2026-08-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('CLOSED');
  });

  it('신청 시작 전이면 UPCOMING', () => {
    const result = resolveTournamentStatus(
      {
        status: 'OPEN',
        applyStartAt: new Date('2026-08-20T00:00:00Z'),
        applyDeadline: new Date('2026-09-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('UPCOMING');
  });

  it('신청 기간 안이면 OPEN', () => {
    const result = resolveTournamentStatus(
      {
        status: 'OPEN',
        applyStartAt: new Date('2026-08-10T00:00:00Z'),
        applyDeadline: new Date('2026-09-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('OPEN');
  });

  it('applyStartAt이 없으면 마감 전까지 OPEN', () => {
    const result = resolveTournamentStatus(
      {
        status: 'OPEN',
        applyStartAt: null,
        applyDeadline: new Date('2026-09-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('OPEN');
  });

  it('마감일과 현재가 같은 순간이면 아직 OPEN이다', () => {
    const deadline = new Date('2026-08-16T12:00:00Z');
    const result = resolveTournamentStatus(
      { status: 'OPEN', applyStartAt: null, applyDeadline: deadline },
      NOW
    );
    expect(result).toBe('OPEN');
  });
});

describe('isAcceptingEntries', () => {
  it('OPEN 상태에서만 true', () => {
    expect(
      isAcceptingEntries(
        {
          status: 'OPEN',
          applyStartAt: null,
          applyDeadline: new Date('2026-09-01T00:00:00Z'),
        },
        NOW
      )
    ).toBe(true);
  });

  it('마감되면 false', () => {
    expect(
      isAcceptingEntries(
        {
          status: 'OPEN',
          applyStartAt: null,
          applyDeadline: new Date('2026-08-01T00:00:00Z'),
        },
        NOW
      )
    ).toBe(false);
  });

  it('DRAFT면 false', () => {
    expect(
      isAcceptingEntries(
        {
          status: 'DRAFT',
          applyStartAt: null,
          applyDeadline: new Date('2026-09-01T00:00:00Z'),
        },
        NOW
      )
    ).toBe(false);
  });

  it('시작 전이면 false', () => {
    expect(
      isAcceptingEntries(
        {
          status: 'OPEN',
          applyStartAt: new Date('2026-08-20T00:00:00Z'),
          applyDeadline: new Date('2026-09-01T00:00:00Z'),
        },
        NOW
      )
    ).toBe(false);
  });
});
