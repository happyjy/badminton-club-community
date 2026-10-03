import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { StatusChip } from '@/components/atoms/StatusChip';

describe('StatusChip', () => {
  it('tone을 직접 주면 그 색으로 그린다', () => {
    render(<StatusChip tone="positive">참석</StatusChip>);

    const chip = screen.getByText('참석');
    expect(chip.className).toContain('bg-positive-soft');
    expect(chip.className).toContain('text-positive');
  });

  it('네 가지 톤을 모두 그린다', () => {
    render(
      <>
        <StatusChip tone="warning">대기</StatusChip>
        <StatusChip tone="negative">불참</StatusChip>
        <StatusChip tone="neutral">미응답</StatusChip>
      </>
    );

    expect(screen.getByText('대기').className).toContain('bg-warning-soft');
    expect(screen.getByText('불참').className).toContain('bg-negative-soft');
    expect(screen.getByText('미응답').className).toContain('bg-neutral-soft');
  });

  it('domain과 status를 주면 대응표에서 색을 찾는다', () => {
    render(
      <StatusChip domain="guest" status="REJECTED">
        거절
      </StatusChip>
    );

    expect(screen.getByText('거절').className).toContain('bg-negative-soft');
  });

  it('모르는 상태값이면 회색으로 그린다', () => {
    render(
      <StatusChip domain="guest" status="SOMETHING_NEW">
        새 상태
      </StatusChip>
    );

    expect(screen.getByText('새 상태').className).toContain('bg-neutral-soft');
  });

  it('상태가 없어도 회색으로 그리고 오류가 나지 않는다', () => {
    render(
      <StatusChip domain="member" status={undefined}>
        알 수 없음
      </StatusChip>
    );

    expect(screen.getByText('알 수 없음').className).toContain(
      'bg-neutral-soft'
    );
  });

  it('가장 작은 글자 크기와 알약 모양이다', () => {
    render(<StatusChip tone="positive">참석</StatusChip>);

    const classes = screen.getByText('참석').className.split(' ');
    expect(classes).toContain('text-caption');
    expect(classes).toContain('rounded-full');
  });
});
