import { describe, expect, it } from '@jest/globals';

import type { EntryPaymentStatus } from '@/types/tournament.types';

import { groupEntriesByEvent } from './groupEntriesByEvent';

/** 테스트마다 필요한 부분만 덮어쓰도록 최소 신청서를 만든다. */
function createEntry(options: {
  id: string;
  depositorName?: string;
  teamName?: string | null;
  paymentStatus?: EntryPaymentStatus;
  events: Array<{
    eventType?: string;
    ageGroup?: string;
    level?: string;
    status?: string;
    players: string[];
  }>;
}) {
  return {
    id: options.id,
    depositorName: options.depositorName ?? '입금자',
    teamName: options.teamName ?? null,
    paymentStatus: options.paymentStatus ?? ('PENDING' as EntryPaymentStatus),
    entryEvents: options.events.map((event) => ({
      status: event.status ?? 'ACTIVE',
      ageGroup: event.ageGroup ?? '30대',
      level: event.level ?? 'A조',
      eventType: { name: event.eventType ?? '남자복식' },
      eventPlayers: event.players.map((name) => ({
        entryPlayer: {
          name,
          birthDate: '1990-03-15',
          phoneNumber: `010-0000-000${name.length}`,
          tshirtSize: null,
        },
      })),
    })),
  };
}

describe('groupEntriesByEvent', () => {
  it('같은 종목의 신청을 하나로 묶는다', () => {
    const result = groupEntriesByEvent([
      createEntry({ id: 'e1', events: [{ players: ['김철수', '박영희'] }] }),
      createEntry({ id: 'e2', events: [{ players: ['이민수', '정다은'] }] }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('남자복식 30대 A조');
    expect(result[0].teams).toHaveLength(2);
  });

  it('복식 파트너를 한 팀으로 유지한다', () => {
    const result = groupEntriesByEvent([
      createEntry({ id: 'e1', events: [{ players: ['김철수', '박영희'] }] }),
      createEntry({ id: 'e2', events: [{ players: ['이민수', '정다은'] }] }),
    ]);

    // 평평하게 폈다면 4명이 한 줄로 늘어서 팀 경계를 알 수 없다.
    expect(result[0].teams[0].players.map((p) => p.name)).toEqual([
      '김철수',
      '박영희',
    ]);
    expect(result[0].teams[1].players.map((p) => p.name)).toEqual([
      '이민수',
      '정다은',
    ]);
  });

  it('종목이 다르면 서로 다른 묶음으로 나눈다', () => {
    const result = groupEntriesByEvent([
      createEntry({
        id: 'e1',
        events: [
          { players: ['김철수', '박영희'] },
          { eventType: '혼합복식', players: ['김철수', '정다은'] },
        ],
      }),
    ]);

    expect(result.map((group) => group.label)).toEqual([
      '남자복식 30대 A조',
      '혼합복식 30대 A조',
    ]);
  });

  it('같은 종목이라도 연령·급수가 다르면 나눈다', () => {
    const result = groupEntriesByEvent([
      createEntry({ id: 'e1', events: [{ players: ['김철수', '박영희'] }] }),
      createEntry({
        id: 'e2',
        events: [{ ageGroup: '40대', players: ['이민수', '정다은'] }],
      }),
    ]);

    expect(result).toHaveLength(2);
  });

  it('취소된 종목은 제외한다', () => {
    const result = groupEntriesByEvent([
      createEntry({
        id: 'e1',
        events: [{ status: 'CANCELED', players: ['김철수', '박영희'] }],
      }),
    ]);

    expect(result).toHaveLength(0);
  });

  it('한 신청서가 같은 종목에 여러 팀을 내면 각각 별도 팀으로 쌓는다', () => {
    const result = groupEntriesByEvent([
      createEntry({
        id: 'e1',
        events: [
          { players: ['김철수', '박영희'] },
          { players: ['이민수', '정다은'] },
        ],
      }),
    ]);

    expect(result[0].teams).toHaveLength(2);
    expect(result[0].teams.every((team) => team.entryId === 'e1')).toBe(true);
  });

  it('단식은 한 팀에 한 명으로 묶는다', () => {
    const result = groupEntriesByEvent([
      createEntry({
        id: 'e1',
        events: [{ eventType: '남자단식', players: ['김철수'] }],
      }),
    ]);

    expect(result[0].teams[0].players).toHaveLength(1);
  });

  it('종목별 총 인원을 센다', () => {
    const result = groupEntriesByEvent([
      createEntry({ id: 'e1', events: [{ players: ['김철수', '박영희'] }] }),
      createEntry({ id: 'e2', events: [{ players: ['이민수', '정다은'] }] }),
      createEntry({ id: 'e3', events: [{ players: ['홍길동', '손흥민'] }] }),
    ]);

    expect(result[0].teams).toHaveLength(3);
    expect(result[0].playerCount).toBe(6);
  });

  it('팀에 신청서의 입금 상태와 입금자명을 남긴다', () => {
    const result = groupEntriesByEvent([
      createEntry({
        id: 'e1',
        depositorName: '김철수',
        paymentStatus: 'CONFIRMED',
        events: [{ players: ['김철수', '박영희'] }],
      }),
    ]);

    expect(result[0].teams[0].paymentStatus).toBe('CONFIRMED');
    expect(result[0].teams[0].depositorName).toBe('김철수');
  });

  it('종목이 처음 등장한 순서를 유지한다', () => {
    const result = groupEntriesByEvent([
      createEntry({
        id: 'e1',
        events: [
          { eventType: '혼합복식', players: ['김철수', '정다은'] },
          { eventType: '남자복식', players: ['김철수', '박영희'] },
        ],
      }),
    ]);

    expect(result.map((group) => group.label)).toEqual([
      '혼합복식 30대 A조',
      '남자복식 30대 A조',
    ]);
  });

  it('선수의 생년월일을 함께 넘긴다', () => {
    const result = groupEntriesByEvent([
      createEntry({ id: 'e1', events: [{ players: ['김철수'] }] }),
    ]);

    expect(result[0].teams[0].players[0].birthDate).toBe('1990-03-15');
  });

  it('빈 목록이면 빈 배열을 반환한다', () => {
    expect(groupEntriesByEvent([])).toEqual([]);
  });
});
