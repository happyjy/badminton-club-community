import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';

// next/link는 라우터 없이 렌더링하면 환경에 따라 달라지므로 <a>로 바꿔 둔다.
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

describe('ListGroup', () => {
  it('머리글, 행, 바닥글을 그린다', () => {
    render(
      <ListGroup label="이번 주 운동" footer="참석은 전날까지 바꿀 수 있어요">
        <ListRow title="10월 4일 토요일" />
      </ListGroup>
    );

    expect(screen.getByText('이번 주 운동')).toBeTruthy();
    expect(screen.getByText('10월 4일 토요일')).toBeTruthy();
    expect(screen.getByText('참석은 전날까지 바꿀 수 있어요')).toBeTruthy();
  });

  it('머리글과 바닥글이 없으면 그 자리를 만들지 않는다', () => {
    const { container } = render(
      <ListGroup>
        <ListRow title="행" />
      </ListGroup>
    );

    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });

  it('행이 하나도 없어도 오류 없이 그린다', () => {
    const { container } = render(
      <ListGroup label="비어 있음">{null}</ListGroup>
    );

    expect(container.textContent).toBe('비어 있음');
  });
});

describe('ListRow', () => {
  it('제목, 부제, 앞·뒤 요소를 그린다', () => {
    render(
      <ListRow
        title="김민수"
        subtitle="A조 · 남자"
        leading={<span>앞</span>}
        trailing={<span>뒤</span>}
      />
    );

    expect(screen.getByText('김민수')).toBeTruthy();
    expect(screen.getByText('A조 · 남자')).toBeTruthy();
    expect(screen.getByText('앞')).toBeTruthy();
    expect(screen.getByText('뒤')).toBeTruthy();
  });

  it('href가 있으면 링크이고 화살표가 붙는다', () => {
    const { container } = render(
      <ListRow title="운동 상세" href="/clubs/1/workouts/3" />
    );

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/clubs/1/workouts/3');
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('onClick만 있으면 버튼이고 누르면 불린다', () => {
    const onClick = jest.fn();
    render(<ListRow title="상태 변경" onClick={onClick} />);

    const button = screen.getByRole('button');
    expect(button.getAttribute('type')).toBe('button');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('href도 onClick도 없으면 누를 수 없는 행이고 화살표가 없다', () => {
    const { container } = render(<ListRow title="이번 달 합계" />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('최소 높이 44를 지킨다', () => {
    const { container } = render(<ListRow title="행" />);

    expect((container.firstChild as HTMLElement).className).toContain(
      'min-h-11'
    );
  });

  it('긴 제목은 한 줄로 자르되 전체 글자는 남아 있다', () => {
    const long = '아주 긴 대회 이름 '.repeat(10).trim();
    render(<ListRow title={long} />);

    const title = screen.getByText(long);
    expect(title.className).toContain('truncate');
  });
});
