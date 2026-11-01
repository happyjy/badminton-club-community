import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { Notice } from '@/components/molecules/Notice';

describe('Notice', () => {
  it('내용과 동작을 그린다', () => {
    render(
      <Notice action={<button type="button">배치 삭제</button>}>
        배치 필터 적용 중
      </Notice>
    );
    expect(screen.getByText('배치 필터 적용 중')).toBeTruthy();
    expect(screen.getByRole('button', { name: '배치 삭제' })).toBeTruthy();
  });

  it('tone에 따라 바탕 토큰이 달라진다', () => {
    const { rerender } = render(<Notice>기본</Notice>);
    expect(screen.getByRole('note').className).toContain('bg-surface-muted');
    rerender(<Notice tone="warning">주의</Notice>);
    expect(screen.getByRole('note').className).toContain('bg-warning-soft');
    rerender(<Notice tone="negative">오류</Notice>);
    expect(screen.getByRole('note').className).toContain('bg-negative-soft');
  });
});
