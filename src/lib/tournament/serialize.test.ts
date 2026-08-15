import { describe, expect, it } from '@jest/globals';

import { toPublicParticipants } from './serialize';

const ENTRIES = [
  {
    entryEvents: [
      {
        status: 'ACTIVE' as const,
        eventOption: {
          eventType: '남자복식',
          ageGroup: '30대부',
          level: 'A조',
        },
        eventPlayers: [
          { entryPlayer: { name: '홍길동' } },
          { entryPlayer: { name: '김철수' } },
        ],
      },
    ],
  },
];

describe('toPublicParticipants', () => {
  it('종목별 선수를 평평한 목록으로 펼친다', () => {
    expect(toPublicParticipants(ENTRIES)).toEqual([
      {
        name: '홍길동',
        eventType: '남자복식',
        ageGroup: '30대부',
        level: 'A조',
      },
      {
        name: '김철수',
        eventType: '남자복식',
        ageGroup: '30대부',
        level: 'A조',
      },
    ]);
  });

  it('취소된 종목은 목록에서 제외한다', () => {
    const entries = [
      {
        entryEvents: [
          {
            status: 'CANCELED' as const,
            eventOption: {
              eventType: '남자복식',
              ageGroup: '30대부',
              level: 'A조',
            },
            eventPlayers: [{ entryPlayer: { name: '홍길동' } }],
          },
        ],
      },
    ];
    expect(toPublicParticipants(entries)).toEqual([]);
  });

  it('민감정보 키가 결과에 존재하지 않는다', () => {
    const result = toPublicParticipants(ENTRIES);
    for (const participant of result) {
      expect(participant).not.toHaveProperty('birthDate');
      expect(participant).not.toHaveProperty('phoneNumber');
      expect(participant).not.toHaveProperty('tshirtSize');
      expect(Object.keys(participant).sort()).toEqual([
        'ageGroup',
        'eventType',
        'level',
        'name',
      ]);
    }
  });

  it('여러 신청서를 하나의 목록으로 합친다', () => {
    const entries = [...ENTRIES, ...ENTRIES];
    expect(toPublicParticipants(entries)).toHaveLength(4);
  });

  it('신청서가 없으면 빈 배열', () => {
    expect(toPublicParticipants([])).toEqual([]);
  });
});
