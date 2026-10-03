import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { IconButton } from '@/components/atoms/buttons/IconButton';

describe('IconButton', () => {
  it('aria-label로 찾을 수 있고 크기는 44 × 44다', () => {
    render(
      <IconButton aria-label="닫기">
        <svg />
      </IconButton>
    );

    const button = screen.getByRole('button', { name: '닫기' });
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('w-11');
  });

  it('폼 안에서 실수로 제출되지 않도록 type의 기본값은 button이다', () => {
    render(
      <IconButton aria-label="닫기">
        <svg />
      </IconButton>
    );

    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('filled는 연회색 바탕이 깔린다', () => {
    render(
      <IconButton aria-label="추가" variant="filled">
        <svg />
      </IconButton>
    );

    expect(screen.getByRole('button').className).toContain('bg-fill');
  });

  it('누르면 onClick이 불린다', () => {
    const onClick = jest.fn();
    render(
      <IconButton aria-label="닫기" onClick={onClick}>
        <svg />
      </IconButton>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
