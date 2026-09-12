import { describe, expect, it } from '@jest/globals';

import {
  buildGuestListQuery,
  parseGuestListQuery,
  GUEST_LIST_DEFAULTS,
} from '@/lib/guestListQuery';

describe('parseGuestListQuery', () => {
  it('쿼리가 비어 있으면 첫 페이지 전체 목록으로 읽는다', () => {
    expect(parseGuestListQuery({})).toEqual(GUEST_LIST_DEFAULTS);
  });

  it('페이지와 필터를 그대로 읽는다', () => {
    expect(
      parseGuestListQuery({
        page: '3',
        type: 'GUEST_REQUEST',
        status: 'PENDING',
      })
    ).toEqual({
      page: 3,
      typeFilter: 'GUEST_REQUEST',
      statusFilter: 'PENDING',
    });
  });

  it('숫자가 아닌 페이지는 1로 보정한다', () => {
    expect(parseGuestListQuery({ page: 'abc' }).page).toBe(1);
  });

  it('0 이하이거나 소수인 페이지는 1로 보정한다', () => {
    expect(parseGuestListQuery({ page: '0' }).page).toBe(1);
    expect(parseGuestListQuery({ page: '-2' }).page).toBe(1);
    expect(parseGuestListQuery({ page: '1.5' }).page).toBe(1);
  });

  it('같은 키가 여러 번 오면 첫 값만 쓴다', () => {
    expect(
      parseGuestListQuery({ page: ['2', '5'], status: ['APPROVED', 'REJECTED'] })
    ).toEqual({
      page: 2,
      typeFilter: 'ALL',
      statusFilter: 'APPROVED',
    });
  });
});

describe('buildGuestListQuery', () => {
  it('기본 상태는 빈 쿼리로 만들어 URL을 깨끗하게 둔다', () => {
    expect(buildGuestListQuery(GUEST_LIST_DEFAULTS)).toEqual({});
  });

  it('기본값이 아닌 항목만 쿼리에 담는다', () => {
    expect(
      buildGuestListQuery({
        page: 3,
        typeFilter: 'ALL',
        statusFilter: 'PENDING',
      })
    ).toEqual({ page: '3', status: 'PENDING' });
  });

  it('모든 항목이 기본값이 아니면 전부 담는다', () => {
    expect(
      buildGuestListQuery({
        page: 2,
        typeFilter: 'JOIN_INQUIRY_REQUEST',
        statusFilter: 'APPROVED',
      })
    ).toEqual({
      page: '2',
      type: 'JOIN_INQUIRY_REQUEST',
      status: 'APPROVED',
    });
  });

  it('읽고 다시 써도 같은 상태가 유지된다', () => {
    const state = {
      page: 4,
      typeFilter: 'GUEST_REQUEST',
      statusFilter: 'REJECTED',
    };

    expect(parseGuestListQuery(buildGuestListQuery(state))).toEqual(state);
  });
});
