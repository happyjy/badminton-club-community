import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { CalendarX } from 'lucide-react';

import { Skeleton } from '@/components/atoms/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState';

describe('EmptyState', () => {
  it('아이콘, 문구, 설명, 버튼을 그린다', () => {
    const { container } = render(
      <EmptyState
        icon={CalendarX}
        title="이번 주 운동이 아직 없어요"
        description="일정이 올라오면 여기에 보여요"
        action={<button type="button">일정 만들기</button>}
      />
    );

    expect(container.querySelector('svg')).toBeTruthy();
    expect(screen.getByText('이번 주 운동이 아직 없어요')).toBeTruthy();
    expect(screen.getByText('일정이 올라오면 여기에 보여요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '일정 만들기' })).toBeTruthy();
  });

  it('문구만 줘도 그려진다', () => {
    const { container } = render(<EmptyState title="게시글이 없어요" />);

    expect(screen.getByText('게시글이 없어요')).toBeTruthy();
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });
});

describe('Skeleton', () => {
  it('깜빡이는 자리 표시이고 화면 낭독기에는 숨긴다', () => {
    const { container } = render(<Skeleton className="h-5 w-32" />);

    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('bg-fill');
    expect(el.className).toContain('h-5');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});
