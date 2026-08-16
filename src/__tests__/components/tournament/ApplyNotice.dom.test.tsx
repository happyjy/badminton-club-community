import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import ApplyNotice from '@/components/organisms/tournament/entry/ApplyNotice';

describe('ApplyNotice', () => {
  it('주의사항을 제목과 함께 보여준다', () => {
    render(<ApplyNotice notice="티셔츠는 한 치수 작게 신청해주세요." />);

    expect(screen.getByText('신청 전 확인해주세요')).toBeTruthy();
    expect(
      screen.getByText('티셔츠는 한 치수 작게 신청해주세요.')
    ).toBeTruthy();
  });

  it('줄바꿈이 있는 여러 줄 안내도 그대로 담는다', () => {
    const notice = '· 티셔츠는 한 치수 작게\n· 입금은 신청 후 3일 내';
    const { container } = render(<ApplyNotice notice={notice} />);

    expect(container.textContent).toContain(notice);
  });

  it('안내 속 URL을 링크로 만든다', () => {
    render(<ApplyNotice notice="사이즈표 https://example.com/size 참고" />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com/size');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('null이면 아무것도 그리지 않는다', () => {
    const { container } = render(<ApplyNotice notice={null} />);

    expect(container.innerHTML).toBe('');
  });

  it('undefined면 아무것도 그리지 않는다', () => {
    const { container } = render(<ApplyNotice notice={undefined} />);

    expect(container.innerHTML).toBe('');
  });

  it('공백뿐이면 아무것도 그리지 않는다', () => {
    const { container } = render(<ApplyNotice notice={'   \n  '} />);

    expect(container.innerHTML).toBe('');
  });
});
