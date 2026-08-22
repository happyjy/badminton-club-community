import { describe, expect, it } from '@jest/globals';

import { CSV_HEADER, toCsvRows, toCsvString } from './csv';

const ENTRY = {
  depositorName: '홍길동',
  teamName: '번개클럽',
  paymentStatus: 'CONFIRMED' as const,
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

describe('toCsvRows', () => {
  it('종목당 선수 수만큼 행을 만든다', () => {
    const rows = toCsvRows([ENTRY]);
    expect(rows).toHaveLength(2);
  });

  it('행에 종목·선수·입금 정보가 담긴다', () => {
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
      '번개클럽',
      '홍길동',
      '30000',
      '입금확인',
    ]);
  });

  it('취소된 종목은 제외한다', () => {
    const entry = {
      ...ENTRY,
      entryEvents: [{ ...ENTRY.entryEvents[0], status: 'CANCELED' as const }],
    };
    expect(toCsvRows([entry])).toEqual([]);
  });

  it('팀명과 티셔츠가 없으면 빈 문자열로 채운다', () => {
    const entry = {
      ...ENTRY,
      teamName: null,
      entryEvents: [
        {
          ...ENTRY.entryEvents[0],
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
    expect(first[7]).toBe('');
    expect(first[9]).toBe('');
  });

  it('입금 상태를 한글로 변환한다', () => {
    const pending = toCsvRows([{ ...ENTRY, paymentStatus: 'PENDING' }]);
    expect(pending[0][12]).toBe('입금대기');
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
    const [member, external] = toCsvRows([ENTRY]);

    // 티셔츠(7) 다음 열이 소속 여부다.
    expect(member[8]).toBe('소속');
    expect(external[8]).toBe('외부');
  });

  it('헤더에 소속 여부 열이 있다', () => {
    expect(CSV_HEADER[8]).toBe('소속여부');
  });
});
