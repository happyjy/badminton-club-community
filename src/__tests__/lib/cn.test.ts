import { describe, expect, it } from '@jest/globals';

import { cn } from '@/lib/utils';

describe('cn', () => {
  it('글자 크기 토큰과 글자색 토큰은 함께 남는다', () => {
    expect(cn('text-body', 'text-secondary')).toBe('text-body text-secondary');
  });

  it('글자 크기 토큰끼리는 뒤의 것이 이긴다', () => {
    expect(cn('text-body', 'text-footnote')).toBe('text-footnote');
  });

  it('글자 크기 토큰은 Tailwind 기본 크기와도 겨룬다', () => {
    expect(cn('text-body', 'text-sm')).toBe('text-sm');
  });

  it('글자색 토큰끼리는 뒤의 것이 이긴다', () => {
    expect(cn('text-primary', 'text-negative')).toBe('text-negative');
  });

  it('높이·배경처럼 원래 알던 것은 그대로 겨룬다', () => {
    expect(cn('h-11 bg-accent', 'h-8 bg-fill')).toBe('h-8 bg-fill');
  });

  it('거짓 값은 버린다', () => {
    expect(cn('h-11', false, undefined, null, '')).toBe('h-11');
  });
});
