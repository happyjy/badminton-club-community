import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { Pagination } from '@/components/molecules/Pagination';

describe('Pagination', () => {
  it('쪽이 하나면 그리지 않는다', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onChange={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('현재 쪽을 aria-current로 알린다', () => {
    render(<Pagination page={3} totalPages={5} onChange={() => {}} />);

    const nav = screen.getByRole('navigation', { name: '페이지' });
    const current = within(nav).getByRole('button', { name: '3쪽' });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(
      within(nav)
        .getByRole('button', { name: '2쪽' })
        .getAttribute('aria-current')
    ).toBeNull();
  });

  it('쪽 번호를 누르면 그 쪽으로 바꿔 달라고 한다', () => {
    const onChange = jest.fn();
    render(<Pagination page={3} totalPages={5} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '5쪽' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('현재 쪽을 눌러도 아무 일도 없다', () => {
    const onChange = jest.fn();
    render(<Pagination page={3} totalPages={5} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '3쪽' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('이전·다음 버튼으로 한 쪽씩 옮긴다', () => {
    const onChange = jest.fn();
    render(<Pagination page={3} totalPages={5} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '이전 쪽' }));
    fireEvent.click(screen.getByRole('button', { name: '다음 쪽' }));
    expect(onChange.mock.calls).toEqual([[2], [4]]);
  });

  it('첫 쪽에서는 이전이, 끝 쪽에서는 다음이 잠긴다', () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={5} onChange={() => {}} />
    );
    expect(
      (screen.getByRole('button', { name: '이전 쪽' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);

    rerender(<Pagination page={5} totalPages={5} onChange={() => {}} />);
    expect(
      (screen.getByRole('button', { name: '다음 쪽' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
});
