import type { ParsedUrlQuery } from 'querystring';

/**
 * 게스트 신청 목록의 화면 상태(페이지 + 필터).
 * 이 상태는 URL 쿼리스트링에 보관한다. 뒤로가기로 목록에 돌아왔을 때
 * 브라우저가 URL을 복원해 주면 화면 상태도 그대로 따라오게 하기 위해서다.
 */
export interface GuestListQuery {
  page: number;
  typeFilter: string;
  statusFilter: string;
}

export const GUEST_LIST_DEFAULTS: GuestListQuery = {
  page: 1,
  typeFilter: 'ALL',
  statusFilter: 'ALL',
};

/** 쿼리 값이 배열로 올 수 있어(?type=A&type=B) 첫 값만 쓴다. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * URL 쿼리를 화면 상태로 읽어낸다.
 * 값이 없거나 망가져 있으면 기본값으로 떨어뜨린다.
 */
export function parseGuestListQuery(query: ParsedUrlQuery): GuestListQuery {
  const rawPage = firstValue(query.page);
  const parsedPage = Number(rawPage);
  const page =
    rawPage !== undefined && Number.isInteger(parsedPage) && parsedPage >= 1
      ? parsedPage
      : GUEST_LIST_DEFAULTS.page;

  return {
    page,
    typeFilter: firstValue(query.type) || GUEST_LIST_DEFAULTS.typeFilter,
    statusFilter: firstValue(query.status) || GUEST_LIST_DEFAULTS.statusFilter,
  };
}

/**
 * 화면 상태를 URL 쿼리로 되돌린다.
 * 기본값은 넣지 않아 URL을 짧게 유지한다.
 */
export function buildGuestListQuery(
  state: GuestListQuery
): Record<string, string> {
  const query: Record<string, string> = {};

  if (state.page !== GUEST_LIST_DEFAULTS.page) {
    query.page = String(state.page);
  }
  if (state.typeFilter !== GUEST_LIST_DEFAULTS.typeFilter) {
    query.type = state.typeFilter;
  }
  if (state.statusFilter !== GUEST_LIST_DEFAULTS.statusFilter) {
    query.status = state.statusFilter;
  }

  return query;
}
