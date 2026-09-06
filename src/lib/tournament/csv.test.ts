import { describe, expect, it } from '@jest/globals';

import { CSV_HEADER, toCsvRows, toCsvString } from './csv';

const ENTRY = {
  depositorName: '홍길동',
  teamName: '번개클럽',
  paymentStatus: 'CONFIRMED' as const,
  isExternal: false,
  contactPhone: null,
  entryEvents: [
    {
      status: 'ACTIVE' as const,
      fee: 30000,
      ageGroup: '30대',
      level: 'A조',
      eventType: { name: '남자복식' },
      eventPlayers: [
        {
          entryPlayer: {
            name: '홍길동',
            gender: '남',
            birthDate: '1990-01-01',
            phoneNumber: '010-1111-2222',
            tshirtSize: 'L',
            isClubMember: true,
          },
        },
        {
          entryPlayer: {
            name: '김철수',
            gender: '남',
            birthDate: '1988-05-05',
            phoneNumber: '010-3333-4444',
            tshirtSize: 'XL',
            isClubMember: false,
          },
        },
      ],
    },
  ],
};

/** 단식처럼 선수가 한 명인 신청. */
const SINGLE_PLAYER_ENTRY = {
  ...ENTRY,
  entryEvents: [
    {
      ...ENTRY.entryEvents[0],
      eventType: { name: '남자단식' },
      eventPlayers: [ENTRY.entryEvents[0].eventPlayers[0]],
    },
  ],
};

describe('toCsvRows', () => {
  it('복식 파트너를 한 행에 담는다', () => {
    // 선수별로 행을 나누면 엑셀에서 누가 누구와 한 팀인지 알 수 없었다.
    const rows = toCsvRows([ENTRY]);
    expect(rows).toHaveLength(1);
  });

  it('행에 종목·두 선수·입금 정보가 담긴다', () => {
    const [first] = toCsvRows([ENTRY]);
    expect(first).toEqual([
      '남자복식',
      '30대',
      'A조',
      '홍길동',
      '남',
      '1990-01-01',
      '010-1111-2222',
      'L',
      '소속',
      '김철수',
      '남',
      '1988-05-05',
      '010-3333-4444',
      'XL',
      '외부',
      '번개클럽',
      '홍길동',
      '30000',
      '입금확인',
      '회원',
      '',
    ]);
  });

  it('참가비는 팀 단위라 행마다 한 번만 적는다', () => {
    const [first] = toCsvRows([ENTRY]);
    expect(first.filter((cell) => cell === '30000')).toHaveLength(1);
  });

  it('선수가 한 명이면 선수2 열을 빈 칸으로 채운다', () => {
    const [first] = toCsvRows([SINGLE_PLAYER_ENTRY]);

    // 빈 칸으로 채우지 않으면 뒤따르는 팀명·참가비 열이 통째로 밀린다.
    expect(first).toHaveLength(CSV_HEADER.length);
    expect(first.slice(9, 15)).toEqual(['', '', '', '', '', '']);
    expect(first[CSV_HEADER.indexOf('참가비')]).toBe('30000');
  });

  it('취소된 종목은 제외한다', () => {
    const entry = {
      ...ENTRY,
      entryEvents: [{ ...ENTRY.entryEvents[0], status: 'CANCELED' as const }],
    };
    expect(toCsvRows([entry])).toEqual([]);
  });

  it('종목이 여러 개면 종목마다 행을 만든다', () => {
    const entry = {
      ...ENTRY,
      entryEvents: [...ENTRY.entryEvents, ...SINGLE_PLAYER_ENTRY.entryEvents],
    };
    const rows = toCsvRows([entry]);
    expect(rows.map((row) => row[0])).toEqual(['남자복식', '남자단식']);
  });

  it('팀명과 티셔츠가 없으면 빈 문자열로 채운다', () => {
    const entry = {
      ...SINGLE_PLAYER_ENTRY,
      teamName: null,
      entryEvents: [
        {
          ...SINGLE_PLAYER_ENTRY.entryEvents[0],
          eventPlayers: [
            {
              entryPlayer: {
                ...ENTRY.entryEvents[0].eventPlayers[0].entryPlayer,
                tshirtSize: null,
              },
            },
          ],
        },
      ],
    };
    const [first] = toCsvRows([entry]);
    expect(first[CSV_HEADER.indexOf('선수1티셔츠')]).toBe('');
    expect(first[CSV_HEADER.indexOf('팀명')]).toBe('');
  });

  it('입금 상태를 한글로 변환한다', () => {
    const pending = toCsvRows([{ ...ENTRY, paymentStatus: 'PENDING' }]);
    expect(pending[0][CSV_HEADER.indexOf('입금상태')]).toBe('입금대기');
  });

  it('헤더 길이와 행 길이가 같다', () => {
    const [first] = toCsvRows([ENTRY]);
    expect(first).toHaveLength(CSV_HEADER.length);
  });
});

describe('toCsvString', () => {
  it('BOM으로 시작해 엑셀에서 한글이 깨지지 않는다', () => {
    const csv = toCsvString([['가나다']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('쉼표가 든 값을 큰따옴표로 감싼다', () => {
    const csv = toCsvString([['가,나']]);
    expect(csv).toContain('"가,나"');
  });

  it('큰따옴표가 든 값을 이스케이프한다', () => {
    const csv = toCsvString([['가"나']]);
    expect(csv).toContain('"가""나"');
  });

  it('행을 개행으로 잇는다', () => {
    const csv = toCsvString([['a'], ['b']]);
    expect(csv.replace('﻿', '')).toBe('a\r\nb');
  });
});

describe('toCsvRows - 소속 여부', () => {
  it('소속 여부를 주최측이 읽을 수 있는 말로 적는다', () => {
    const [row] = toCsvRows([ENTRY]);

    expect(row[CSV_HEADER.indexOf('선수1소속여부')]).toBe('소속');
    expect(row[CSV_HEADER.indexOf('선수2소속여부')]).toBe('외부');
  });

  it('헤더에 선수별 소속 여부 열이 있다', () => {
    expect(CSV_HEADER).toContain('선수1소속여부');
    expect(CSV_HEADER).toContain('선수2소속여부');
  });
});

describe('toCsvRows - 외부 신청 구분', () => {
  const baseEntry = {
    depositorName: '김철수',
    teamName: null,
    paymentStatus: 'PENDING' as const,
    entryEvents: [
      {
        status: 'ACTIVE' as const,
        fee: 70000,
        ageGroup: '30대',
        level: '',
        eventType: { name: '남자복식' },
        eventPlayers: [
          {
            entryPlayer: {
              name: '김철수',
              gender: '남',
              birthDate: '1990-01-01',
              phoneNumber: '010-1111-2222',
              tshirtSize: null,
              isClubMember: false,
            },
          },
        ],
      },
    ],
  };

  it('외부 신청은 신청경로를 외부로 표기한다', () => {
    const rows = toCsvRows([
      { ...baseEntry, isExternal: true, contactPhone: '010-1111-2222' },
    ]);
    expect(rows[0][CSV_HEADER.indexOf('신청경로')]).toBe('외부');
    expect(rows[0][CSV_HEADER.indexOf('신청자연락처')]).toBe('010-1111-2222');
  });

  it('회원 신청은 신청경로를 회원으로 표기한다', () => {
    const rows = toCsvRows([
      { ...baseEntry, isExternal: false, contactPhone: null },
    ]);
    expect(rows[0][CSV_HEADER.indexOf('신청경로')]).toBe('회원');
  });

  it('헤더에 신청경로와 신청자연락처가 있다', () => {
    expect(CSV_HEADER).toContain('신청경로');
    expect(CSV_HEADER).toContain('신청자연락처');
  });

  it('헤더 길이와 행 길이가 항상 같다 — 어긋나면 엑셀에서 열이 밀린다', () => {
    const rows = toCsvRows([
      { ...baseEntry, isExternal: true, contactPhone: '010-1111-2222' },
    ]);
    expect(rows[0]).toHaveLength(CSV_HEADER.length);
  });
});
