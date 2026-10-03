import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';

import {
  GuestApplicationItem,
  GuestApplicationList,
} from '@/components/organisms/guest/GuestApplicationList';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const NOW = new Date(2026, 9, 3);

const item = (
  patch: Partial<GuestApplicationItem> = {}
): GuestApplicationItem => ({
  id: 'g1',
  name: '류승환',
  status: 'APPROVED',
  visitDate: '2026-07-09',
  createdAt: new Date(2026, 6, 6),
  intendToJoin: false,
  ...patch,
});

const renderList = (items: GuestApplicationItem[]) =>
  render(
    <GuestApplicationList
      label="내 게스트 신청 내역"
      applications={items}
      hrefFor={(id) => `/clubs/1/guest/${id}`}
      now={NOW}
    />
  );

describe('GuestApplicationList', () => {
  it('신청마다 이름, 방문일·신청일, 상태를 한 행에 보여 준다', () => {
    renderList([item()]);

    const row = screen.getByRole('link');
    expect(within(row).getByText('류승환')).toBeTruthy();
    expect(within(row).getByText('방문 7.9 · 신청 7.6')).toBeTruthy();
    expect(within(row).getByText('승인됨')).toBeTruthy();
  });

  it('행을 누르면 그 신청의 상세로 간다', () => {
    renderList([item({ id: 'abc' })]);

    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/clubs/1/guest/abc'
    );
  });

  it('상태에 따라 글자와 색이 다르다', () => {
    renderList([
      item({ id: 'a', status: 'APPROVED' }),
      item({ id: 'b', status: 'REJECTED' }),
      item({ id: 'c', status: 'PENDING' }),
    ]);

    expect(screen.getByText('승인됨').className).toContain('bg-positive-soft');
    expect(screen.getByText('거절됨').className).toContain('bg-negative-soft');
    expect(screen.getByText('검토중').className).toContain('bg-warning-soft');
  });

  it('모르는 상태값이면 지금처럼 "검토중"으로 보여 준다', () => {
    renderList([item({ status: 'SOMETHING_NEW' })]);

    expect(screen.getByText('검토중')).toBeTruthy();
  });

  it('가입 의향이 있는 신청에만 "가입희망" 칩이 붙는다', () => {
    renderList([
      item({ id: 'a', name: '류승환', intendToJoin: true }),
      item({ id: 'b', name: '유효한', intendToJoin: false }),
      item({ id: 'c', name: '김영훈', intendToJoin: null }),
    ]);

    const rows = screen.getAllByRole('link');
    expect(within(rows[0]).getByText('가입희망')).toBeTruthy();
    expect(within(rows[1]).queryByText('가입희망')).toBeNull();
    expect(within(rows[2]).queryByText('가입희망')).toBeNull();
  });

  it('긴 이름을 자르지 않는다 (줄바꿈해서 다 보여 준다)', () => {
    renderList([item({ name: '조윤미(코치님게스트) 그리고 아주 긴 이름' })]);

    const name = screen.getByText('조윤미(코치님게스트) 그리고 아주 긴 이름');
    expect(name.className).not.toMatch(/truncate|line-clamp/);
    expect(name.className).toContain('break-words');
  });

  it('이름이 없으면 "-"로 보여 준다', () => {
    renderList([item({ name: null })]);

    expect(within(screen.getByRole('link')).getByText('-')).toBeTruthy();
  });

  it('방문일이 없으면 신청일만 보여 준다', () => {
    renderList([item({ visitDate: null })]);

    expect(screen.getByText('신청 7.6')).toBeTruthy();
    expect(screen.queryByText(/방문/)).toBeNull();
  });

  it('올해가 아닌 날짜에는 연도를 붙인다', () => {
    renderList([
      item({ visitDate: '2025-12-30', createdAt: new Date(2025, 11, 28) }),
    ]);

    expect(screen.getByText('방문 2025.12.30 · 신청 2025.12.28')).toBeTruthy();
  });

  it('넘긴 순서대로 그린다', () => {
    renderList([
      item({ id: 'a', name: '하나' }),
      item({ id: 'b', name: '둘' }),
      item({ id: 'c', name: '셋' }),
    ]);

    expect(
      screen.getAllByRole('link').map((row) => row.getAttribute('href'))
    ).toEqual(['/clubs/1/guest/a', '/clubs/1/guest/b', '/clubs/1/guest/c']);
  });

  it('묶음의 제목을 보여 주고, 행의 터치 영역은 44 이상이다', () => {
    renderList([item()]);

    expect(screen.getByText('내 게스트 신청 내역')).toBeTruthy();
    expect(screen.getByRole('link').className).toContain('min-h-11');
  });

  it('표를 쓰지 않는다 (가로 스크롤이 생기지 않게)', () => {
    const { container } = renderList([item()]);

    expect(container.querySelector('table')).toBeNull();
    expect(container.innerHTML).not.toContain('overflow-x-auto');
  });
});
