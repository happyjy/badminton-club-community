/**
 * processView.ts(순수 함수)의 동작 안전망.
 *
 * 리팩토링 1번으로 process.tsx의 인라인 함수들이 추출된 모듈을 직접 검증한다.
 * jsdom 환경 — PaymentRecordFilters 등 컴포넌트 타입이 같은 그래프에 있어 jsdom에 둔다.
 */
import { describe, it, expect } from '@jest/globals';

import type { PaymentRecordFilterValues } from '@/components/molecules/membership-fee/PaymentRecordFilters';

import {
  formatLocalDate,
  buildRecentRange,
  diffDaysInclusive,
  getRecordMemberIds,
  formatMatchedMembersForSort,
  applyFilters,
  applySort,
} from '@/lib/membership-fee/processView';
import type { PaymentRecord } from '@/types/membership-fee.types';

const EMPTY_FILTERS: PaymentRecordFilterValues = {
  depositorNameKeyword: '',
  amountMin: '',
  amountMax: '',
  matchedMemberIds: [],
};

function makeRecord(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: 'r1',
    batchId: 'b1',
    clubId: 1,
    transactionDate: new Date('2025-05-01T00:00:00Z'),
    depositorName: '홍길동',
    amount: 30000,
    memo: null,
    matchedMemberId: null,
    status: 'PENDING',
    errorReason: null,
    createdAt: new Date('2025-05-01'),
    updatedAt: new Date('2025-05-01'),
    ...overrides,
  } as PaymentRecord;
}

describe('formatLocalDate', () => {
  it('YYYY-MM-DD 로컬 포맷으로 zero-pad', () => {
    expect(formatLocalDate(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(formatLocalDate(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('UTC가 아닌 로컬 기준 (timezone 안전)', () => {
    // 로컬 자정 기준이라 timezone과 무관하게 동일한 날짜 부분이 나와야 함
    const d = new Date(2025, 6, 15);
    expect(formatLocalDate(d)).toBe('2025-07-15');
  });
});

describe('buildRecentRange', () => {
  it('to는 오늘, from은 N개월 전 (오늘 동일 일자)', () => {
    const today = new Date();
    const range = buildRecentRange(3);
    expect(range.to).toBe(formatLocalDate(today));
    const expectedFrom = new Date();
    expectedFrom.setMonth(expectedFrom.getMonth() - 3);
    expect(range.from).toBe(formatLocalDate(expectedFrom));
  });

  it('12개월(=1년) 전부터 오늘', () => {
    const today = new Date();
    const range = buildRecentRange(12);
    const expectedFrom = new Date();
    expectedFrom.setMonth(expectedFrom.getMonth() - 12);
    expect(range.from).toBe(formatLocalDate(expectedFrom));
    expect(range.to).toBe(formatLocalDate(today));
  });
});

describe('diffDaysInclusive', () => {
  it('같은 날은 1일', () => {
    expect(diffDaysInclusive('2025-05-01', '2025-05-01')).toBe(1);
  });

  it('2025-05-01 ~ 2025-05-10 = 10일', () => {
    expect(diffDaysInclusive('2025-05-01', '2025-05-10')).toBe(10);
  });

  it('윤년 안전 — 2024-02-01 ~ 2024-03-01 = 30일 (29일 포함)', () => {
    expect(diffDaysInclusive('2024-02-01', '2024-03-01')).toBe(30);
  });

  it('1년 경계 — 정확히 366일이면 366', () => {
    // 2024는 윤년이라 1/1 ~ 12/31 = 366일
    expect(diffDaysInclusive('2024-01-01', '2024-12-31')).toBe(366);
  });
});

describe('getRecordMemberIds', () => {
  it('matchedMembers가 우선', () => {
    const r = makeRecord({
      matchedMemberId: 99,
      matchedMembers: [
        { id: 'm1', clubMemberId: 1 },
        { id: 'm2', clubMemberId: 2 },
      ],
    });
    expect(getRecordMemberIds(r)).toEqual([1, 2]);
  });

  it('matchedMembers가 비어있으면 matchedMemberId fallback', () => {
    const r = makeRecord({ matchedMemberId: 7, matchedMembers: [] });
    expect(getRecordMemberIds(r)).toEqual([7]);
  });

  it('둘 다 없으면 빈 배열', () => {
    expect(getRecordMemberIds(makeRecord())).toEqual([]);
  });
});

describe('formatMatchedMembersForSort', () => {
  it('matchedMembers 이름들을 콤마로 join', () => {
    const r = makeRecord({
      matchedMembers: [
        { id: 'm1', clubMemberId: 1, clubMember: { id: 1, name: '김철수' } },
        { id: 'm2', clubMemberId: 2, clubMember: { id: 2, name: '이영희' } },
      ],
    });
    expect(formatMatchedMembersForSort(r)).toBe('김철수, 이영희');
  });

  it('matchedMembers 비어있을 때 matchedMember.name fallback', () => {
    const r = makeRecord({
      matchedMember: { id: 1, name: '김철수' },
    });
    expect(formatMatchedMembersForSort(r)).toBe('김철수');
  });

  it('아무 매칭도 없으면 빈 문자열', () => {
    expect(formatMatchedMembersForSort(makeRecord())).toBe('');
  });
});

describe('applyFilters', () => {
  const records: PaymentRecord[] = [
    makeRecord({
      id: '1',
      depositorName: '홍길동',
      amount: 10000,
      matchedMemberId: 1,
    }),
    makeRecord({
      id: '2',
      depositorName: 'Jane Doe',
      amount: 30000,
      matchedMemberId: 2,
    }),
    makeRecord({
      id: '3',
      depositorName: '김철수',
      amount: 50000,
      matchedMembers: [{ id: 'mm', clubMemberId: 3 }],
    }),
  ];

  it('빈 필터는 전체 통과', () => {
    expect(applyFilters(records, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('depositorNameKeyword — 부분 일치 대소문자 무시', () => {
    const out = applyFilters(records, {
      ...EMPTY_FILTERS,
      depositorNameKeyword: 'jane',
    });
    expect(out.map((r) => r.id)).toEqual(['2']);
  });

  it('depositorNameKeyword — 공백만이면 무시', () => {
    expect(
      applyFilters(records, { ...EMPTY_FILTERS, depositorNameKeyword: '   ' })
    ).toHaveLength(3);
  });

  it('amountMin/amountMax 양쪽 경계 포함', () => {
    const out = applyFilters(records, {
      ...EMPTY_FILTERS,
      amountMin: '10000',
      amountMax: '30000',
    });
    expect(out.map((r) => r.id).sort()).toEqual(['1', '2']);
  });

  it('amountMin만 단독으로 동작', () => {
    const out = applyFilters(records, {
      ...EMPTY_FILTERS,
      amountMin: '20000',
    });
    expect(out.map((r) => r.id).sort()).toEqual(['2', '3']);
  });

  it('amountMax만 단독으로 동작', () => {
    const out = applyFilters(records, {
      ...EMPTY_FILTERS,
      amountMax: '15000',
    });
    expect(out.map((r) => r.id)).toEqual(['1']);
  });

  it('matchedMemberIds — 단건 매칭 (matchedMemberId)', () => {
    const out = applyFilters(records, {
      ...EMPTY_FILTERS,
      matchedMemberIds: [1],
    });
    expect(out.map((r) => r.id)).toEqual(['1']);
  });

  it('matchedMemberIds — 다중 매칭 (matchedMembers)', () => {
    const out = applyFilters(records, {
      ...EMPTY_FILTERS,
      matchedMemberIds: [3],
    });
    expect(out.map((r) => r.id)).toEqual(['3']);
  });

  it('여러 조건 AND 결합', () => {
    const out = applyFilters(records, {
      depositorNameKeyword: '김',
      amountMin: '40000',
      amountMax: '',
      matchedMemberIds: [3],
    });
    expect(out.map((r) => r.id)).toEqual(['3']);
  });
});

describe('applySort', () => {
  const records: PaymentRecord[] = [
    makeRecord({
      id: '1',
      transactionDate: new Date('2025-05-03'),
      depositorName: 'B',
      amount: 20000,
      status: 'MATCHED',
      matchedMember: { id: 1, name: '김철수' },
    }),
    makeRecord({
      id: '2',
      transactionDate: new Date('2025-05-01'),
      depositorName: 'A',
      amount: 30000,
      status: 'CONFIRMED',
      matchedMember: { id: 2, name: '이영희' },
    }),
    makeRecord({
      id: '3',
      transactionDate: new Date('2025-05-02'),
      depositorName: 'C',
      amount: 10000,
      status: 'PENDING',
      matchedMember: { id: 3, name: '박민수' },
    }),
  ];

  it('원본 배열을 변경하지 않음', () => {
    const before = records.map((r) => r.id);
    applySort(records, 'transactionDate', 'asc');
    expect(records.map((r) => r.id)).toEqual(before);
  });

  it('transactionDate asc/desc', () => {
    expect(
      applySort(records, 'transactionDate', 'asc').map((r) => r.id)
    ).toEqual(['2', '3', '1']);
    expect(
      applySort(records, 'transactionDate', 'desc').map((r) => r.id)
    ).toEqual(['1', '3', '2']);
  });

  it('depositorName asc/desc', () => {
    expect(applySort(records, 'depositorName', 'asc').map((r) => r.id)).toEqual(
      ['2', '1', '3']
    );
    expect(
      applySort(records, 'depositorName', 'desc').map((r) => r.id)
    ).toEqual(['3', '1', '2']);
  });

  it('amount asc/desc', () => {
    expect(applySort(records, 'amount', 'asc').map((r) => r.id)).toEqual([
      '3',
      '1',
      '2',
    ]);
    expect(applySort(records, 'amount', 'desc').map((r) => r.id)).toEqual([
      '2',
      '1',
      '3',
    ]);
  });

  it('matchedMember — 회원명 기준 정렬', () => {
    expect(applySort(records, 'matchedMember', 'asc').map((r) => r.id)).toEqual(
      ['1', '3', '2']
    );
  });

  it('status 알파벳 기준 정렬', () => {
    expect(applySort(records, 'status', 'asc').map((r) => r.id)).toEqual([
      '2',
      '1',
      '3',
    ]);
  });
});
